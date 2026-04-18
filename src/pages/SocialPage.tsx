import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { fetchUserSummary, saveUserSocial } from '../features/auth/userSlice';
import { userApi, type UserSearchResult } from '../services/userService';

const SocialPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useAppSelector((state) => state.auth);
  const { social, isLoading, isSaving } = useAppSelector((state) => state.userDomain);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    dispatch(fetchUserSummary());
  }, [dispatch, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, maxWidth: 760 }}>
        <Alert severity={isGuest ? 'info' : 'warning'}>
          {isGuest ? 'Guest accounts do not have persistent social data.' : 'Sign in to manage friends, invites, and blocks.'}
        </Alert>
        {!isGuest && (
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        )}
      </Box>
    );
  }

  const refreshSummary = () => {
    dispatch(fetchUserSummary());
  };

  const handleSocialSetting = (key: string, value: unknown) => {
    dispatch(saveUserSocial({ [key]: value }));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data } = await userApi.searchUsers(searchQuery.trim());
      setSearchResults(data.data.results as UserSearchResult[]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    await userApi.sendFriendRequest(targetUserId);
    refreshSummary();
  };

  const handleAccept = async (userId: string) => {
    await userApi.acceptFriendRequest(userId);
    refreshSummary();
  };

  const handleDecline = async (userId: string) => {
    await userApi.declineFriendRequest(userId);
    refreshSummary();
  };

  const handleBlock = async (userId: string) => {
    await userApi.blockUser(userId);
    refreshSummary();
  };

  const handleUnblock = async (userId: string) => {
    await userApi.unblockUser(userId);
    refreshSummary();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 920 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
          Social
        </Typography>
        {(isLoading || isSaving || isSearching) && <CircularProgress size={20} />}
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Invite And Visibility Policies
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Friend Request Policy</InputLabel>
            <Select
              value={social?.friendRequestPolicy || 'everyone'}
              label="Friend Request Policy"
              onChange={(e) => handleSocialSetting('friendRequestPolicy', e.target.value)}
            >
              <MenuItem value="everyone">Everyone</MenuItem>
              <MenuItem value="friends_of_friends">Friends Of Friends</MenuItem>
              <MenuItem value="nobody">Nobody</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Direct Challenge Policy</InputLabel>
            <Select
              value={social?.directChallengePolicy || 'everyone'}
              label="Direct Challenge Policy"
              onChange={(e) => handleSocialSetting('directChallengePolicy', e.target.value)}
            >
              <MenuItem value="everyone">Everyone</MenuItem>
              <MenuItem value="friends_only">Friends Only</MenuItem>
              <MenuItem value="nobody">Nobody</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Profile Visibility</InputLabel>
            <Select
              value={social?.profileVisibility || 'public'}
              label="Profile Visibility"
              onChange={(e) => handleSocialSetting('profileVisibility', e.target.value)}
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="friends_only">Friends Only</MenuItem>
              <MenuItem value="private">Private</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Game History Visibility</InputLabel>
            <Select
              value={social?.gameHistoryVisibility || 'friends_only'}
              label="Game History Visibility"
              onChange={(e) => handleSocialSetting('gameHistoryVisibility', e.target.value)}
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="friends_only">Friends Only</MenuItem>
              <MenuItem value="private">Private</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Find Players
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Search username, display name, or friend code"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="contained" onClick={handleSearch}>
            Search
          </Button>
        </Box>
        {searchResults.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Search for players to send direct friend requests.
          </Typography>
        ) : (
          searchResults.map((result) => (
            <Paper key={result.userId} variant="outlined" sx={{ p: 1.25, mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {result.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                @{result.username} · {result.friendCode}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="contained" onClick={() => handleSendRequest(result.userId)}>
                  Send Request
                </Button>
                <Button size="small" variant="outlined" color="error" onClick={() => handleBlock(result.userId)}>
                  Block
                </Button>
              </Box>
            </Paper>
          ))
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Incoming Requests
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {social?.incomingFriendRequests?.length ? (
          social.incomingFriendRequests.map((person) => (
            <Paper key={person._id} variant="outlined" sx={{ p: 1.25, mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {person.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {person.email}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button size="small" variant="contained" onClick={() => handleAccept(person._id)}>
                  Accept
                </Button>
                <Button size="small" variant="outlined" onClick={() => handleDecline(person._id)}>
                  Decline
                </Button>
                <Button size="small" variant="text" color="error" onClick={() => handleBlock(person._id)}>
                  Block
                </Button>
              </Box>
            </Paper>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No pending friend requests.
          </Typography>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Friends
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {social?.friends?.length ? (
          social.friends.map((friend) => (
            <Paper key={friend._id} variant="outlined" sx={{ p: 1.25, mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {friend.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {friend.email}
              </Typography>
            </Paper>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No friends yet.
          </Typography>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Blocked Users
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {social?.blockedUsers?.length ? (
          social.blockedUsers.map((person) => (
            <Paper key={person._id} variant="outlined" sx={{ p: 1.25, mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {person.username}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {person.email}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => handleUnblock(person._id)}>
                Unblock
              </Button>
            </Paper>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No blocked users.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default SocialPage;
