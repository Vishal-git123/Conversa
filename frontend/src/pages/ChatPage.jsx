import { useEffect, useMemo, useRef, useState } from 'react';
import { UserButton, useAuth, useUser } from '@clerk/react';
import { io } from 'socket.io-client';
import { authFetch, API_BASE_URL } from '../lib/api';
import UserProfile from '../Components/UserProfile';

function ChatPage() {
  const { isLoaded } = useUser();
  const { getToken } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState('recent');
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showProfile, setShowProfile] = useState(null);
  const messageEndRef = useRef(null);
  const activeChatRef = useRef(activeChatUser);

  useEffect(() => {
    activeChatRef.current = activeChatUser;
  }, [activeChatUser]);

  useEffect(() => {
    if (!isLoaded) return;

    async function loadSession() {
      setLoading(true);
      setError('');
      try {
        const profile = await authFetch(getToken, '/api/auth/check');
        setCurrentUser(profile);
      } catch (err) {
        setError(err.message || 'Unable to verify session');
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [isLoaded, getToken]);

  useEffect(() => {
    if (!currentUser) return;

    const socket = io(API_BASE_URL, {
      query: { userId: String(currentUser._id) },
      transports: ['websocket'],
    });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('getOnlineUsers', (ids) => {
      setOnlineUsers(Array.isArray(ids) ? ids.map(String) : []);
    });

    socket.on('newMessage', (incoming) => {
      const partnerId = activeChatRef.current ? String(activeChatRef.current._id) : null;
      const currentId = String(currentUser._id);
      const incomingSender = String(incoming.senderId);
      const incomingReceiver = String(incoming.receiverId);

      if (
        partnerId &&
        ((incomingSender === partnerId && incomingReceiver === currentId) ||
          (incomingReceiver === partnerId && incomingSender === currentId))
      ) {
        setMessages((prev) => [...prev, incoming]);
      }

      refreshSidebar().catch(() => {});
    });

    refreshSidebar().catch(() => {});

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (!activeChatUser || !currentUser) return;

    async function loadMessages() {
      setMessagesLoading(true);
      setError('');
      try {
        const result = await authFetch(getToken, `/api/messages/${activeChatUser._id}`);
        setMessages(result || []);
      } catch (err) {
        setError(err.message || 'Unable to fetch conversation');
      } finally {
        setMessagesLoading(false);
      }
    }

    loadMessages();
  }, [activeChatUser, currentUser, getToken]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function refreshSidebar() {
    if (!currentUser) return;
    try {
      const [usersList, recentConversations] = await Promise.all([
        authFetch(getToken, '/api/messages/users'),
        authFetch(getToken, '/api/messages/conversations'),
      ]);

      setUsers(usersList || []);
      setConversations(recentConversations || []);
      if (!activeChatUser && recentConversations?.length) {
        setActiveChatUser(recentConversations[0]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load contacts');
    }
  }

  async function handleSearch(query) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await authFetch(getToken, `/api/messages/search?q=${encodeURIComponent(query)}`);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    if (!activeChatUser) {
      setError('Select a contact before sending a message.');
      return;
    }

    if (!messageText.trim() && !mediaFile) {
      return;
    }

    setError('');
    const formData = new FormData();
    formData.append('text', messageText.trim());
    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/messages/send/${activeChatUser._id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to send message');
      }

      const created = await response.json();
      setMessages((prev) => [...prev, created]);
      setMessageText('');
      setMediaFile(null);
      refreshSidebar().catch(() => {});
    } catch (err) {
      setError(err.message || 'Send failed');
    }
  }

  const isActiveOnline = useMemo(
    () => activeChatUser && onlineUsers.includes(String(activeChatUser._id)),
    [activeChatUser, onlineUsers],
  );

  const participantList = activeTab === 'recent' ? conversations : users;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[2rem] border border-slate-700 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Conversa</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">A modern realtime chat experience</h1>
              <p className="mt-4 max-w-2xl text-slate-400">Use secure Clerk authentication and backend-powered conversations to exchange text, images, and video with your peers.</p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-3xl border border-slate-700 bg-slate-950/90 p-3 sm:self-center">
              {currentUser ? (
                <>
                  <div className="space-y-0.5 text-right text-sm text-slate-400">
                    <p className="text-sm font-medium text-slate-100">{currentUser.fullName}</p>
                    <p className="text-xs">{currentUser.email}</p>
                  </div>
                  <UserButton afterSignOutUrl="/auth" />
                </>
              ) : (
                <div className="text-sm text-slate-400">Loading profile…</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-4 rounded-[2rem] border border-slate-700 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Contacts</p>
                <p className="mt-1 text-sm text-slate-400">Pick a recent conversation or browse everyone.</p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">{onlineUsers.length} online</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('recent');
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${activeTab === 'recent' ? 'bg-sky-500/15 text-sky-200' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('people');
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${activeTab === 'people' ? 'bg-sky-500/15 text-sky-200' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'}`}
              >
                People
              </button>
            </div>

            {activeTab === 'people' && (
              <div className="rounded-[1.75rem] border border-slate-700 bg-slate-950/80 p-3">
                <input
                  type="text"
                  placeholder="Search contacts…"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10"
                />
              </div>
            )}

            <div className="space-y-3 overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-950/80 p-2 overflow-y-auto max-h-[600px]">
              {loading ? (
                <div className="p-6 text-center text-slate-400">Loading contacts…</div>
              ) : searchQuery.trim() && searchResults.length === 0 && !isSearching ? (
                <div className="p-6 text-center text-slate-400">No contacts found.</div>
              ) : (
                (() => {
                  const displayList = searchQuery.trim() ? searchResults : participantList;
                  return displayList.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No contacts found.</div>
                  ) : (
                    displayList.map((contact) => {
                  const isActive = activeChatUser && String(activeChatUser._id) === String(contact._id);
                  const isOnline = onlineUsers.includes(String(contact._id));
                  return (
                    <button
                      key={contact._id}
                      type="button"
                      onClick={() => setActiveChatUser(contact)}
                      className={`flex w-full items-center gap-3 rounded-3xl border px-3 py-3 text-left transition ${isActive ? 'border-sky-400 bg-slate-800/90' : 'border-transparent bg-slate-950/90 hover:border-slate-700 hover:bg-slate-900'}`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-sm font-semibold text-slate-200">
                        {contact.fullName?.split(' ').map((item) => item[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{contact.fullName}</p>
                        <p className="truncate text-xs text-slate-500">{contact.email}</p>
                      </div>
                      <span className={`ml-auto h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-slate-700 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/10">
            {error && (
              <div className="mb-4 rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}
            <div className="mb-4 flex flex-col gap-3 rounded-[1.75rem] border border-slate-700 bg-slate-950/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Active chat</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">
                  {activeChatUser ? activeChatUser.fullName : 'Select a contact to begin'}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                {socketConnected ? 'Realtime connected' : 'Connecting…'}
                {activeChatUser && (
                  <span className="ml-2 rounded-full bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                    {isActiveOnline ? 'Online' : 'Offline'}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-6 min-h-[420px] overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-950/90 p-4">
              {messagesLoading ? (
                <div className="grid h-full place-items-center text-slate-400">Loading messages…</div>
              ) : !activeChatUser ? (
                <div className="grid h-full place-items-center text-center text-slate-500">
                  <p className="text-lg font-medium text-slate-100">Choose a contact to start chatting.</p>
                  <p className="mt-2 text-sm text-slate-400">Recent conversations and people show on the left.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="grid h-full place-items-center text-slate-400">Say hello to {activeChatUser.fullName}.</div>
              ) : (
                <div className="flex h-full flex-col gap-4 overflow-y-auto pr-2">
                  {messages.map((message) => {
                    const outgoing = String(message.senderId) === String(currentUser?._id);
                    const createdAt = message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div key={message._id || `${message.senderId}-${message.createdAt}-${Math.random()}`} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] space-y-3 rounded-3xl border px-4 py-3 ${outgoing ? 'border-sky-500/20 bg-sky-500/15 text-slate-100' : 'border-slate-700 bg-slate-950 text-slate-200'}`}>
                          {message.image && (
                            <img src={message.image} alt="Shared media" className="max-h-72 w-full rounded-3xl object-cover" />
                          )}
                          {message.video && (
                            <video controls className="max-h-72 w-full rounded-3xl bg-slate-900">
                              <source src={message.video} />
                              Your browser does not support video playback.
                            </video>
                          )}
                          {message.text && <p className="whitespace-pre-line text-sm leading-6">{message.text}</p>}
                          <div className="text-right text-[11px] uppercase tracking-[0.2em] text-slate-500">{outgoing ? 'You' : activeChatUser.fullName} · {createdAt}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messageEndRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-[1.75rem] border border-slate-700 bg-slate-950/90 p-4">
                <label className="block text-sm font-medium text-slate-400">Message</label>
                <textarea
                  className="mt-2 min-h-[120px] w-full resize-none rounded-3xl border border-slate-800 bg-slate-900/95 p-4 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10"
                  placeholder={activeChatUser ? 'Write your message…' : 'Select a contact to start chatting.'}
                  value={messageText}
                  disabled={!activeChatUser}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <label className="mt-3 flex h-12 w-full cursor-pointer items-center justify-between rounded-3xl border border-dashed border-slate-700 bg-slate-900/90 px-4 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
                  <span>{mediaFile ? mediaFile.name : 'Attach image or video'}</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={!activeChatUser || (!messageText.trim() && !mediaFile)}
                className="inline-flex h-12 items-center justify-center rounded-3xl bg-sky-500 px-6 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                Send
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
