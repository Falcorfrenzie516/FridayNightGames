import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { Users, UserPlus, Check, X, Search, UserMinus, Clock, ChevronRight, Loader } from 'lucide-react';
import { ICON_MAP } from './ProfileDropdown';
import {
  getFriendsAndRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUserByName,
  FriendWithProfile,
} from '../lib/friendsService';

interface FriendsListProps {
  user: User;
  displayName: string;
}

function Avatar({ name, icon, size = 'sm' }: { name: string; icon: string; size?: 'sm' | 'md' }) {
  const src = ICON_MAP[icon];
  const initials = name ? name.slice(0, 2).toUpperCase() : '??';
  const cls = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';
  const imgCls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className={`${cls} rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden`}>
      {src ? (
        <img src={src} alt={name} className={`${imgCls} object-contain`} />
      ) : (
        <span className="text-xs">{initials}</span>
      )}
    </div>
  );
}

export default function FriendsList({ user, displayName }: FriendsListProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'friends' | 'add'>('friends');
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string; display_icon: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const pendingIncoming = friends.filter(f => f.status === 'pending' && !f.isSender);
  const pendingOutgoing = friends.filter(f => f.status === 'pending' && f.isSender);
  const accepted = friends.filter(f => f.status === 'accepted');
  const pendingCount = pendingIncoming.length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) loadFriends();
  }, [open]);

  async function loadFriends() {
    setLoading(true);
    const data = await getFriendsAndRequests(user.id);
    setFriends(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!searchName.trim()) {
      setSearchResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchUserByName(searchName, user.id);
      setSearchResults(results);
      setSearched(true);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchName]);

  async function handleSendRequest(receiverId: string) {
    setSendingTo(receiverId);
    const { ok, error } = await sendFriendRequest(receiverId);
    setSendingTo(null);
    if (ok) {
      setFeedback('Friend request sent!');
      setSearchName('');
      setSearchResults([]);
      setSearched(false);
      await loadFriends();
    } else if (error?.includes('duplicate') || error?.includes('unique')) {
      setFeedback('Request already sent or you are already friends.');
    } else {
      setFeedback(error ?? 'Failed to send request.');
    }
    setTimeout(() => setFeedback(''), 3000);
  }

  async function handleAccept(requestId: string) {
    setActionLoading(requestId);
    await acceptFriendRequest(requestId);
    await loadFriends();
    setActionLoading(null);
  }

  async function handleReject(requestId: string) {
    setActionLoading(requestId);
    await rejectFriendRequest(requestId);
    await loadFriends();
    setActionLoading(null);
  }

  async function handleRemove(requestId: string) {
    setActionLoading(requestId);
    await removeFriend(requestId);
    await loadFriends();
    setActionLoading(null);
  }

  const alreadyFriendIds = new Set(friends.map(f => f.friendId));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition shadow-sm"
        title="Friends"
      >
        <Users className="w-4 h-4" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800">Friends</h3>
              {pendingCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                  {pendingCount} request{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setTab('friends')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${tab === 'friends' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                My Friends
              </button>
              <button
                onClick={() => setTab('add')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1 ${tab === 'add' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                <UserPlus className="w-3 h-3" />
                Add Friend
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {tab === 'friends' && (
              <div>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-5 h-5 text-gray-300 animate-spin" />
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-400">No friends yet</p>
                    <p className="text-xs text-gray-300 mt-1">Search for players to add them</p>
                  </div>
                ) : (
                  <div>
                    {pendingIncoming.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 pt-3 pb-1">Incoming Requests</p>
                        {pendingIncoming.map(f => (
                          <div key={f.requestId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition">
                            <Avatar name={f.displayName} icon={f.displayIcon} />
                            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{f.displayName}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleAccept(f.requestId)}
                                disabled={actionLoading === f.requestId}
                                className="w-7 h-7 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-full flex items-center justify-center transition"
                                title="Accept"
                              >
                                {actionLoading === f.requestId ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleReject(f.requestId)}
                                disabled={actionLoading === f.requestId}
                                className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-500 rounded-full flex items-center justify-center transition"
                                title="Decline"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {accepted.length > 0 && (
                      <div>
                        {pendingIncoming.length > 0 && <div className="border-t border-gray-100 mx-4 my-1" />}
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 pt-2 pb-1">Friends ({accepted.length})</p>
                        {accepted.map(f => (
                          <div key={f.requestId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition group">
                            <Avatar name={f.displayName} icon={f.displayIcon} />
                            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{f.displayName}</span>
                            <button
                              onClick={() => handleRemove(f.requestId)}
                              disabled={actionLoading === f.requestId}
                              className="w-7 h-7 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-full items-center justify-center transition hidden group-hover:flex"
                              title="Remove friend"
                            >
                              {actionLoading === f.requestId ? <Loader className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {pendingOutgoing.length > 0 && (
                      <div>
                        {(pendingIncoming.length > 0 || accepted.length > 0) && <div className="border-t border-gray-100 mx-4 my-1" />}
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 pt-2 pb-1">Pending Sent</p>
                        {pendingOutgoing.map(f => (
                          <div key={f.requestId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition">
                            <Avatar name={f.displayName} icon={f.displayIcon} />
                            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{f.displayName}</span>
                            <div className="flex items-center gap-1.5 text-xs text-amber-600">
                              <Clock className="w-3 h-3" />
                              <span className="font-medium">Pending</span>
                            </div>
                            <button
                              onClick={() => handleRemove(f.requestId)}
                              disabled={actionLoading === f.requestId}
                              className="w-6 h-6 text-gray-300 hover:text-red-400 flex items-center justify-center transition"
                              title="Cancel request"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'add' && (
              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-400">Type a name to search for players.</p>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    {searching && (
                      <Loader className="absolute right-3 w-4 h-4 text-blue-400 animate-spin pointer-events-none" />
                    )}
                    <input
                      type="text"
                      value={searchName}
                      onChange={e => setSearchName(e.target.value)}
                      placeholder="Search players..."
                      className="w-full text-sm pl-9 pr-9 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none transition text-gray-700"
                    />
                  </div>

                  {searchName.trim() && searched && searchResults.length > 0 && (
                    <div className="mt-1.5 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {searchResults.map(result => (
                        <div key={result.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                          <Avatar name={result.display_name} icon={result.display_icon} size="md" />
                          <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{result.display_name}</span>
                          {alreadyFriendIds.has(result.id) ? (
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1 flex-shrink-0">
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              {friends.find(f => f.friendId === result.id)?.status === 'accepted' ? 'Friends' : 'Pending'}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(result.id)}
                              disabled={sendingTo === result.id}
                              className="flex items-center gap-1.5 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 flex-shrink-0"
                            >
                              {sendingTo === result.id ? <Loader className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                              Add
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {searchName.trim() && searched && !searching && searchResults.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-3">No players found matching "{searchName}"</p>
                  )}
                </div>

                {feedback && (
                  <p className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">{feedback}</p>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-300 text-center">Your name: <span className="font-semibold text-gray-400">{displayName || 'Not set'}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

export { ChevronRight };
