import { supabase } from './supabase';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface FriendWithProfile {
  requestId: string;
  friendId: string;
  displayName: string;
  displayIcon: string;
  isSender: boolean;
  status: 'pending' | 'accepted' | 'rejected';
}

export async function getFriendsAndRequests(userId: string): Promise<FriendWithProfile[]> {
  const { data: requests } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .neq('status', 'rejected');

  if (!requests || requests.length === 0) return [];

  const otherIds = requests.map(r =>
    r.sender_id === userId ? r.receiver_id : r.sender_id
  );

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, display_icon')
    .in('id', otherIds);

  const profileMap: Record<string, { display_name: string; display_icon: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { display_name: p.display_name, display_icon: p.display_icon };
  }

  return requests.map(r => {
    const isSender = r.sender_id === userId;
    const friendId = isSender ? r.receiver_id : r.sender_id;
    const profile = profileMap[friendId] ?? { display_name: 'Unknown', display_icon: '' };
    return {
      requestId: r.id,
      friendId,
      displayName: profile.display_name || 'Unknown',
      displayIcon: profile.display_icon || '',
      isSender,
      status: r.status,
    };
  });
}

export async function searchUserByName(name: string, currentUserId: string): Promise<{ id: string; display_name: string; display_icon: string }[]> {
  const term = name.trim();
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, display_icon')
    .or(`display_name.ilike.%${term}%,email.ilike.%${term}%`)
    .neq('id', currentUserId)
    .not('display_name', 'is', null)
    .limit(8);
  return data ?? [];
}

export async function sendFriendRequest(receiverId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: user.id, receiver_id: receiverId, status: 'pending' });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function acceptFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId);
  return !error;
}

export async function rejectFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);
  return !error;
}

export async function removeFriend(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);
  return !error;
}
