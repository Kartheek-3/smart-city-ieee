import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToChats, subscribeToMessages, sendMessage,
  markMessagesRead, getOrCreateChat, getTotalUnread, canChat
} from '../services/chatService';
import { subscribeToFollowing } from '../services/socialService';
import { getUserData } from '../services/authService';

export default function MessagesPage({ userData, user }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [following, setFollowing] = useState([]);
  const [chatableUsers, setChatableUsers] = useState([]);
  const [loadingChatable, setLoadingChatable] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Subscribe to chats
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToChats(user.uid, setChats);
  }, [user]);

  // Subscribe to following for new chat
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToFollowing(user.uid, setFollowing);
  }, [user]);

  // Subscribe to messages when active chat changes
  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    const unsub = subscribeToMessages(activeChat.id, (msgs) => {
      setMessages(msgs);
      // Mark as read
      markMessagesRead(activeChat.id, user.uid).catch(() => {});
    });
    return unsub;
  }, [activeChat, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      await sendMessage(activeChat.id, user.uid, input);
      setInput('');
      inputRef.current?.focus();
    } catch (err) { setErrorMsg(err.message); }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openNewChat = async () => {
    setShowNewChat(true);
    setLoadingChatable(true);
    // Check which followed users mutually follow back
    const chatable = [];
    for (const f of following) {
      try {
        const mutual = await canChat(user.uid, f.uid);
        if (mutual) {
          const data = await getUserData(f.uid);
          chatable.push(data || f);
        }
      } catch {}
    }
    setChatableUsers(chatable);
    setLoadingChatable(false);
  };

  const startChat = async (targetUser) => {
    try {
      const chat = await getOrCreateChat(user.uid, targetUser.uid, userData?.name, targetUser.name);
      setActiveChat(chat);
      setShowNewChat(false);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const getOtherUser = (chat) => {
    const otherId = chat.participantIds?.find(id => id !== user.uid);
    return chat.participants?.[otherId] || { name: 'Unknown', uid: otherId };
  };

  const getStatusIcon = (status) => {
    if (status === 'read') return <span style={{color:'#4488ff', fontSize:11}}>✓✓</span>;
    if (status === 'delivered') return <span style={{color:'var(--text-sub)', fontSize:11}}>✓✓</span>;
    return <span style={{color:'var(--text-sub)', fontSize:11}}>✓</span>;
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    return d.toLocaleDateString([], { month:'short', day:'numeric' });
  };

  const totalUnread = getTotalUnread(chats, user?.uid);

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .chat-item:hover{background:var(--bg-card-hover) !important}
        .msg-input:focus{border-color:var(--brand-primary) !important}
      `}</style>

      <div style={S.container} className="glass-panel">
        {/* Left Panel — Chat List */}
        <div style={S.leftPanel}>
          <div style={S.leftHeader}>
            <h2 style={S.leftTitle}>💬 Messages</h2>
            <button style={S.newChatBtn} onClick={openNewChat} title="New chat">✏️</button>
          </div>

          {chats.length === 0 && !showNewChat && (
            <div style={S.empty}>
              <span style={{fontSize:40}}>💬</span>
              <p style={{color:'var(--text-sub)', marginTop:8, fontSize:13}}>No conversations yet</p>
              <button style={S.startBtn} onClick={openNewChat}>Start a conversation</button>
            </div>
          )}

          {chats.map(chat => {
            const other = getOtherUser(chat);
            const unread = (chat.receiverId === user.uid && chat.status !== 'read') ? 1 : 0;
            const isActive = activeChat?.id === chat.id;
            return (
              <div key={chat.id} className="chat-item" style={{
                ...S.chatItem, background: isActive ? 'rgba(68,136,255,0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid #4488ff' : '3px solid transparent',
              }} onClick={() => setActiveChat(chat)}>
                <div style={S.chatAvatar}>
                  <span style={{fontWeight:800, fontSize:14, color:'#4488ff'}}>{other.name?.[0]?.toUpperCase()||'?'}</span>
                </div>
                <div style={{flex:1, overflow:'hidden'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <p style={{...S.chatName, fontWeight: unread > 0 ? 800 : 600}}>{other.name}</p>
                    <span style={{color:'var(--text-sub)', fontSize:10}}>{formatTime(chat.lastMessageTime)}</span>
                  </div>
                  <p style={{...S.chatPreview, color: unread > 0 ? 'var(--text-main)' : 'var(--text-sub)'}}>
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
                {unread > 0 && <span style={S.unreadBadge}>{unread}</span>}
              </div>
            );
          })}
        </div>

        {/* Right Panel — Active Chat */}
        <div style={S.rightPanel}>
          {!activeChat ? (
            <div style={S.noChat}>
              <span style={{fontSize:60}}>💬</span>
              <h3 style={{color:'var(--text-main)', fontWeight:700, marginTop:16}}>Select a conversation</h3>
              <p style={{color:'var(--text-sub)', fontSize:14, marginTop:4}}>Choose a chat from the sidebar or start a new one</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={S.chatHeader}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={S.chatAvatar}>
                    <span style={{fontWeight:800, fontSize:14, color:'#4488ff'}}>{getOtherUser(activeChat).name?.[0]?.toUpperCase()||'?'}</span>
                  </div>
                  <div>
                    <p style={{color:'var(--text-main)', fontWeight:700, fontSize:15, margin:0}}>{getOtherUser(activeChat).name}</p>
                    <p style={{color:'var(--text-sub)', fontSize:11, margin:0}}>Mutual connection</p>
                  </div>
                </div>
                <button style={{background:'none', border:'none', color:'var(--text-sub)', fontSize:16, cursor:'pointer'}} onClick={() => setActiveChat(null)}>✕</button>
              </div>

              {/* Messages */}
              <div style={S.messagesArea}>
                {messages.length === 0 && (
                  <div style={{textAlign:'center', padding:'40px 0'}}>
                    <span style={{fontSize:32}}>👋</span>
                    <p style={{color:'var(--text-sub)', marginTop:8, fontSize:13}}>Start the conversation!</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMine = msg.senderId === user.uid;
                  const showDate = i === 0 || new Date(messages[i-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div style={S.dateDivider}>
                          <span style={S.dateLabel}>{new Date(msg.createdAt).toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' })}</span>
                        </div>
                      )}
                      <div style={{
                        display:'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                        marginBottom:6, animation:'msgIn 0.2s ease',
                      }}>
                        <div style={{
                          ...S.bubble,
                          background: isMine ? 'linear-gradient(135deg, #1a5fe8, #0d47a1)' : 'var(--bg-card)',
                          border: isMine ? 'none' : '1px solid var(--border-main)',
                          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          color: isMine ? '#fff' : 'var(--text-main)',
                        }}>
                          <p style={{margin:0, fontSize:14, lineHeight:1.5, wordBreak:'break-word'}}>{msg.text}</p>
                          <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:4, marginTop:4}}>
                            <span style={{fontSize:10, opacity:0.6}}>{new Date(msg.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                            {isMine && getStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} style={S.inputBar}>
                <input
                  ref={inputRef}
                  className="msg-input"
                  style={S.msgInput}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                />
                <button type="submit" disabled={sending || !input.trim()} style={{
                  ...S.sendBtn,
                  opacity: input.trim() ? 1 : 0.4,
                }}>
                  {sending ? '⏳' : '➤'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div style={S.overlay} onClick={() => setShowNewChat(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
              <h3 style={{color:'var(--text-main)', fontSize:18, fontWeight:700, margin:0}}>✏️ New Conversation</h3>
              <button onClick={() => setShowNewChat(false)} style={{background:'none', border:'none', color:'var(--text-sub)', fontSize:20, cursor:'pointer'}}>✕</button>
            </div>
            <p style={{color:'var(--text-sub)', fontSize:13, marginBottom:16}}>Start a chat with someone you mutually follow.</p>

            {loadingChatable && (
              <div style={{textAlign:'center', padding:'20px 0'}}>
                <p style={{color:'var(--text-sub)', fontSize:13}}>Loading mutual connections...</p>
              </div>
            )}

            {!loadingChatable && chatableUsers.length === 0 && (
              <div style={{textAlign:'center', padding:'20px 0'}}>
                <span style={{fontSize:36}}>🤝</span>
                <p style={{color:'var(--text-sub)', marginTop:8, fontSize:13}}>No mutual connections yet. Follow people and have them follow you back to chat!</p>
              </div>
            )}

            {chatableUsers.map(u => (
              <div key={u.uid} className="chat-item" style={{...S.chatItem, cursor:'pointer'}} onClick={() => startChat(u)}>
                <div style={S.chatAvatar}>
                  <span style={{fontWeight:800, fontSize:14, color:'#4488ff'}}>{u.name?.[0]?.toUpperCase()||'?'}</span>
                </div>
                <div style={{flex:1}}>
                  <p style={S.chatName}>{u.name}</p>
                  <p style={{color:'var(--text-sub)', fontSize:12, margin:0}}>{u.email}</p>
                </div>
                <span style={{color:'var(--brand-primary)', fontSize:12, fontWeight:600}}>Chat →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && (
        <div style={S.errorToast}>
          <span>⚠ {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{background:'none', border:'none', color:'#ff9999', cursor:'pointer', marginLeft:12}}>✕</button>
        </div>
      )}
    </div>
  );
}

const S = {
  page:         { height:'100vh', display:'flex', flexDirection:'column', fontFamily:'system-ui,sans-serif' },
  container:    { display:'flex', flex:1, overflow:'hidden' },
  // Left panel
  leftPanel:    { width:340, borderRight:'1px solid var(--border-main)', display:'flex', flexDirection:'column', background:'transparent', overflow:'hidden' },
  leftHeader:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 18px', borderBottom:'1px solid var(--border-main)' },
  leftTitle:    { color:'var(--text-main)', fontSize:18, fontWeight:800, margin:0 },
  newChatBtn:   { background:'var(--bg-input)', border:'1px solid var(--border-main)', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer' },
  chatItem:     { display:'flex', gap:12, alignItems:'center', padding:'14px 18px', cursor:'pointer', transition:'background 0.15s', borderBottom:'1px solid var(--border-main)' },
  chatAvatar:   { width:40, height:40, borderRadius:12, background:'rgba(68,136,255,0.12)', border:'1px solid rgba(68,136,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  chatName:     { color:'var(--text-main)', fontSize:14, fontWeight:600, margin:0 },
  chatPreview:  { fontSize:12, margin:'2px 0 0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180 },
  unreadBadge:  { background:'#4488ff', color:'#fff', borderRadius:10, fontSize:11, fontWeight:700, padding:'2px 7px', flexShrink:0 },
  empty:        { textAlign:'center', padding:'40px 20px', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' },
  startBtn:     { marginTop:12, background:'var(--brand-primary)', border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:700, padding:'10px 20px', cursor:'pointer' },
  // Right panel
  rightPanel:   { flex:1, display:'flex', flexDirection:'column', background:'transparent' },
  noChat:       { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' },
  chatHeader:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', borderBottom:'1px solid var(--border-main)', background:'transparent' },
  messagesArea: { flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column' },
  dateDivider:  { textAlign:'center', margin:'16px 0' },
  dateLabel:    { background:'var(--bg-card)', border:'1px solid var(--border-main)', borderRadius:20, padding:'4px 14px', fontSize:11, color:'var(--text-sub)', fontWeight:500 },
  bubble:       { maxWidth:'70%', padding:'10px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' },
  inputBar:     { display:'flex', gap:10, padding:'16px 24px', borderTop:'1px solid var(--border-main)', background:'transparent' },
  msgInput:     { flex:1, padding:'12px 16px', background:'var(--bg-input)', border:'1px solid var(--border-main)', borderRadius:12, color:'var(--text-main)', fontSize:14, outline:'none', transition:'border-color 0.2s' },
  sendBtn:      { width:44, height:44, borderRadius:12, background:'var(--brand-primary)', border:'none', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'opacity 0.2s' },
  // Modals
  overlay:      { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 },
  modal:        { background:'var(--bg-card)', border:'1px solid var(--border-main)', borderRadius:20, padding:28, width:'100%', maxWidth:440, boxShadow:'0 32px 64px rgba(0,0,0,0.5)', maxHeight:'70vh', overflowY:'auto' },
  errorToast:   { position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:'rgba(255,68,68,0.15)', border:'1px solid rgba(255,68,68,0.3)', borderRadius:12, padding:'10px 18px', color:'#ff9999', fontSize:13, zIndex:99999, display:'flex', alignItems:'center' },
};
