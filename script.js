// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, push, set, update, onValue, off, query, orderByChild, equalTo, serverTimestamp, onDisconnect } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC7bFhndsJ_ax6U466E4xkv0SbXCdp1IGQ",
    authDomain: "nuvora-chat-app.firebaseapp.com",
    databaseURL: "https://nuvora-chat-app-default-rtdb.firebaseio.com/",
    projectId: "nuvora-chat-app",
    storageBucket: "nuvora-chat-app.firebasestorage.app",
    messagingSenderId: "764236230983",
    appId: "1:764236230983:web:d3dcc8f0b53e8c9ad59c62",
    measurementId: "G-VNYG5C510E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Global variables
let currentUser = null;
let currentChat = null;
let users = [];
let groups = [];
let chats = [];
let messages = {};
let selectedGroupMembers = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    populateEmojis();
    
    // Check if user is logged in
    const storedUser = localStorage.getItem('nuvoraCurrentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showChatApp();
        setupRealTimeListeners();
    } else {
        showAuthScreen();
    }
}

function setupRealTimeListeners() {
    // Listen for all users
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
        users = [];
        const usersData = snapshot.val();
        if (usersData) {
            Object.keys(usersData).forEach(key => {
                users.push({ ...usersData[key], firebaseKey: key });
            });
        }
        loadUsers();
    });

    // Listen for user's chats
    if (currentUser) {
        const chatsRef = ref(database, 'chats');
        onValue(chatsRef, (snapshot) => {
            chats = [];
            const chatsData = snapshot.val();
            if (chatsData) {
                Object.keys(chatsData).forEach(key => {
                    const chat = chatsData[key];
                    if (chat.participants && chat.participants.includes(currentUser.id)) {
                        chats.push({ ...chat, firebaseKey: key });
                    }
                });
            }
            loadChats();
        });

        // Listen for groups
        const groupsRef = ref(database, 'groups');
        onValue(groupsRef, (snapshot) => {
            groups = [];
            const groupsData = snapshot.val();
            if (groupsData) {
                Object.keys(groupsData).forEach(key => {
                    const group = groupsData[key];
                    if (group.members && group.members.includes(currentUser.id)) {
                        groups.push({ ...group, firebaseKey: key });
                    }
                });
            }
            loadGroups();
        });

        // Update user online status
        updateUserOnlineStatus(true);
        
        // Set up disconnect handler
        if (currentUser.firebaseKey) {
            const userOnlineRef = ref(database, `users/${currentUser.firebaseKey}/online`);
            onDisconnect(userOnlineRef).set(false);
        }
    }
}

function setupEventListeners() {
    // Close modals when clicking outside
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };

    // Handle window beforeunload
    window.addEventListener('beforeunload', () => {
        if (currentUser && currentUser.firebaseKey) {
            updateUserOnlineStatus(false);
        }
    });
}

// Authentication Functions
function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('chatApp').style.display = 'none';
}

function showChatApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('chatApp').style.display = 'flex';
    
    if (currentUser) {
        document.getElementById('currentUserName').textContent = currentUser.name;
        document.getElementById('currentUserPic').textContent = currentUser.name.charAt(0).toUpperCase();
        document.getElementById('profileEditName').value = currentUser.name;
        document.getElementById('profileEditBio').value = currentUser.bio || '';
        document.getElementById('profileEditCountry').value = currentUser.country;
        document.getElementById('profileEditPic').textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

function showSignupForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

async function loginUser() {
    const phone = document.getElementById('loginPhone').value.trim();
    
    if (!phone) {
        alert('Please enter your phone number');
        return;
    }

    showLoadingIndicator(true);

    try {
        // Query users by phone number
        const usersRef = ref(database, 'users');
        const phoneQuery = query(usersRef, orderByChild('phone'), equalTo(phone));
        
        onValue(phoneQuery, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                const userKey = Object.keys(userData)[0];
                const user = { ...userData[userKey], firebaseKey: userKey };
                
                currentUser = user;
                localStorage.setItem('nuvoraCurrentUser', JSON.stringify(user));
                
                showChatApp();
                setupRealTimeListeners();
                showLoadingIndicator(false);
            } else {
                showLoadingIndicator(false);
                alert('User not found. Please check your phone number or sign up.');
            }
        }, { onlyOnce: true });

    } catch (error) {
        showLoadingIndicator(false);
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function signupUser() {
    const name = document.getElementById('signupName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const country = document.getElementById('signupCountry').value.trim();
    const bio = document.getElementById('signupBio').value.trim();

    if (!name || !phone || !country) {
        alert('Please fill in all required fields');
        return;
    }

    showLoadingIndicator(true);

    try {
        // Check if phone number already exists
        const usersRef = ref(database, 'users');
        const phoneQuery = query(usersRef, orderByChild('phone'), equalTo(phone));
        
        onValue(phoneQuery, async (snapshot) => {
            const existingUser = snapshot.val();
            if (existingUser) {
                showLoadingIndicator(false);
                alert('Phone number already registered. Please login instead.');
                return;
            }

            // Create new user
            const newUserRef = push(usersRef);
            const userId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
            
            const userData = {
                id: userId,
                name: name,
                phone: phone,
                country: country,
                bio: bio,
                online: true,
                lastSeen: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            await set(newUserRef, userData);
            
            currentUser = { ...userData, firebaseKey: newUserRef.key };
            localStorage.setItem('nuvoraCurrentUser', JSON.stringify(currentUser));
            
            showChatApp();
            setupRealTimeListeners();
            showLoadingIndicator(false);
            
        }, { onlyOnce: true });

    } catch (error) {
        showLoadingIndicator(false);
        console.error('Signup error:', error);
        alert('Signup failed. Please try again.');
    }
}

function logoutUser() {
    if (currentUser && currentUser.firebaseKey) {
        updateUserOnlineStatus(false);
    }
    
    currentUser = null;
    localStorage.removeItem('nuvoraCurrentUser');
    showAuthScreen();
    
    // Clear all data
    users = [];
    groups = [];
    chats = [];
    messages = {};
    currentChat = null;
}

// User status functions
async function updateUserOnlineStatus(isOnline) {
    if (currentUser && currentUser.firebaseKey) {
        const userRef = ref(database, `users/${currentUser.firebaseKey}`);
        await update(userRef, {
            online: isOnline,
            lastSeen: serverTimestamp()
        });
    }
}

// UI Functions
function showTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function loadUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser.id) {
            const userElement = createUserElement(user);
            usersList.appendChild(userElement);
        }
    });
}

function loadChats() {
    const chatsList = document.getElementById('chatsList');
    chatsList.innerHTML = '';
    
    chats.forEach(chat => {
        const chatElement = createChatElement(chat);
        chatsList.appendChild(chatElement);
    });
}

function loadGroups() {
    const groupsList = document.getElementById('groupsList');
    groupsList.innerHTML = '';
    
    groups.forEach(group => {
        const groupElement = createGroupElement(group);
        groupsList.appendChild(groupElement);
    });
}

function createUserElement(user) {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.onclick = () => startChatWithUser(user);
    
    div.innerHTML = `
        <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div class="user-info">
            <h4>${user.name}</h4>
            <p>${user.country}</p>
            <span class="user-status ${user.online ? 'online' : 'offline'}">
                ${user.online ? 'Online' : 'Last seen recently'}
            </span>
        </div>
    `;
    
    return div;
}

function createChatElement(chat) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.onclick = () => openChat(chat);
    
    // Get other participant
    const otherParticipantId = chat.participants.find(id => id !== currentUser.id);
    const otherUser = users.find(u => u.id === otherParticipantId);
    
    if (otherUser) {
        div.innerHTML = `
            <div class="chat-avatar">${otherUser.name.charAt(0).toUpperCase()}</div>
            <div class="chat-info">
                <h4>${otherUser.name}</h4>
                <p>${chat.lastMessage || 'No messages yet'}</p>
                <span class="chat-time">${formatTime(chat.lastMessageTime)}</span>
            </div>
        `;
    }
    
    return div;
}

function createGroupElement(group) {
    const div = document.createElement('div');
    div.className = 'group-item';
    div.onclick = () => openGroup(group);
    
    div.innerHTML = `
        <div class="group-avatar">👥</div>
        <div class="group-info">
            <h4>${group.name}</h4>
            <p>${group.description || 'Group chat'}</p>
            <span class="group-members">${group.members.length} members</span>
        </div>
    `;
    
    return div;
}

// Chat Functions
async function startChatWithUser(user) {
    // Check if chat already exists
    const existingChat = chats.find(chat => 
        chat.participants.includes(currentUser.id) && 
        chat.participants.includes(user.id) &&
        chat.participants.length === 2
    );
    
    if (existingChat) {
        openChat(existingChat);
        return;
    }
    
    // Create new chat
    const chatsRef = ref(database, 'chats');
    const newChatRef = push(chatsRef);
    
    const chatData = {
        participants: [currentUser.id, user.id],
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTime: serverTimestamp()
    };
    
    await set(newChatRef, chatData);
    
    const newChat = { ...chatData, firebaseKey: newChatRef.key };
    openChat(newChat);
}

function openChat(chat) {
    currentChat = chat;
    
    // Get other participant
    const otherParticipantId = chat.participants.find(id => id !== currentUser.id);
    const otherUser = users.find(u => u.id === otherParticipantId);
    
    if (otherUser) {
        document.getElementById('chatName').textContent = otherUser.name;
        document.getElementById('chatStatus').textContent = otherUser.online ? 'Online' : 'Last seen recently';
        document.getElementById('chatAvatar').textContent = otherUser.name.charAt(0).toUpperCase();
    }
    
    // Show chat container
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';
    
    // Load messages
    loadMessages(chat.firebaseKey);
}

function openGroup(group) {
    currentChat = group;
    
    document.getElementById('chatName').textContent = group.name;
    document.getElementById('chatStatus').textContent = `${group.members.length} members`;
    document.getElementById('chatAvatar').textContent = '👥';
    
    // Show chat container
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';
    
    // Load messages
    loadMessages(group.firebaseKey);
}

function loadMessages(chatId) {
    const messagesRef = ref(database, `messages/${chatId}`);
    
    onValue(messagesRef, (snapshot) => {
        const messagesData = snapshot.val();
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        if (messagesData) {
            const messagesArray = Object.keys(messagesData).map(key => ({
                ...messagesData[key],
                firebaseKey: key
            }));
            
            // Sort by timestamp
            messagesArray.sort((a, b) => a.timestamp - b.timestamp);
            
            messagesArray.forEach(message => {
                const messageElement = createMessageElement(message);
                messagesList.appendChild(messageElement);
            });
            
            // Scroll to bottom
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });
}

function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = `message ${message.senderId === currentUser.id ? 'sent' : 'received'}`;
    
    const sender = users.find(u => u.id === message.senderId);
    const senderName = sender ? sender.name : 'Unknown';
    
    div.innerHTML = `
        <div class="message-content">
            ${message.senderId !== currentUser.id ? `<div class="message-sender">${senderName}</div>` : ''}
            <div class="message-text">${message.text}</div>
            <div class="message-time">${formatTime(message.timestamp)}</div>
        </div>
    `;
    
    return div;
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentChat) return;
    
    const messagesRef = ref(database, `messages/${currentChat.firebaseKey}`);
    const newMessageRef = push(messagesRef);
    
    const messageData = {
        text: messageText,
        senderId: currentUser.id,
        timestamp: serverTimestamp()
    };
    
    await set(newMessageRef, messageData);
    
    // Update chat's last message
    const chatRef = ref(database, `chats/${currentChat.firebaseKey}`);
    await update(chatRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp()
    });
    
    messageInput.value = '';
}

function handleMessageKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Modal Functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showProfileModal() {
    showModal('profileModal');
}

function showNewChatModal() {
    showModal('newChatModal');
    loadUsersForChat();
}

function showNewGroupModal() {
    showModal('newGroupModal');
    selectedGroupMembers = [];
    loadUsersForGroup();
}

function loadUsersForChat() {
    const searchUsersList = document.getElementById('searchUsersList');
    searchUsersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser.id) {
            const userElement = document.createElement('div');
            userElement.className = 'search-user-item';
            userElement.onclick = () => {
                startChatWithUser(user);
                closeModal('newChatModal');
            };
            
            userElement.innerHTML = `
                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>${user.country}</p>
                </div>
            `;
            
            searchUsersList.appendChild(userElement);
        }
    });
}

function loadUsersForGroup() {
    const groupMembersList = document.getElementById('groupMembersList');
    groupMembersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.id !== currentUser.id) {
            const userElement = document.createElement('div');
            userElement.className = 'search-user-item';
            userElement.onclick = () => toggleGroupMember(user);
            
            userElement.innerHTML = `
                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>${user.country}</p>
                </div>
                <div class="member-checkbox">
                    <input type="checkbox" ${selectedGroupMembers.includes(user.id) ? 'checked' : ''}>
                </div>
            `;
            
            groupMembersList.appendChild(userElement);
        }
    });
}

function toggleGroupMember(user) {
    const index = selectedGroupMembers.indexOf(user.id);
    if (index > -1) {
        selectedGroupMembers.splice(index, 1);
    } else {
        selectedGroupMembers.push(user.id);
    }
    
    loadUsersForGroup();
    updateSelectedMembersDisplay();
}

function updateSelectedMembersDisplay() {
    const selectedMembersDiv = document.getElementById('selectedMembers');
    selectedMembersDiv.innerHTML = '';
    
    selectedGroupMembers.forEach(memberId => {
        const user = users.find(u => u.id === memberId);
        if (user) {
            const memberElement = document.createElement('div');
            memberElement.className = 'selected-member';
            memberElement.innerHTML = `
                <span>${user.name}</span>
                <button onclick="toggleGroupMember({id: '${user.id}'})">&times;</button>
            `;
            selectedMembersDiv.appendChild(memberElement);
        }
    });
}

async function createGroup() {
    const groupName = document.getElementById('groupNameInput').value.trim();
    const groupDesc = document.getElementById('groupDescInput').value.trim();
    
    if (!groupName || selectedGroupMembers.length === 0) {
        alert('Please enter group name and select at least one member');
        return;
    }
    
    const groupsRef = ref(database, 'groups');
    const newGroupRef = push(groupsRef);
    
    const groupData = {
        name: groupName,
        description: groupDesc,
        members: [currentUser.id, ...selectedGroupMembers],
        createdBy: currentUser.id,
        createdAt: serverTimestamp()
    };
    
    await set(newGroupRef, groupData);
    
    closeModal('newGroupModal');
    
    // Clear form
    document.getElementById('groupNameInput').value = '';
    document.getElementById('groupDescInput').value = '';
    selectedGroupMembers = [];
}

async function updateProfile() {
    const name = document.getElementById('profileEditName').value.trim();
    const bio = document.getElementById('profileEditBio').value.trim();
    const country = document.getElementById('profileEditCountry').value.trim();
    
    if (!name || !country) {
        alert('Name and country are required');
        return;
    }
    
    const userRef = ref(database, `users/${currentUser.firebaseKey}`);
    await update(userRef, {
        name: name,
        bio: bio,
        country: country
    });
    
    // Update local user data
    currentUser.name = name;
    currentUser.bio = bio;
    currentUser.country = country;
    localStorage.setItem('nuvoraCurrentUser', JSON.stringify(currentUser));
    
    // Update UI
    document.getElementById('currentUserName').textContent = name;
    document.getElementById('currentUserPic').textContent = name.charAt(0).toUpperCase();
    
    closeModal('profileModal');
}

// Search Functions
function searchChats() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const chatItems = document.querySelectorAll('.chat-item, .user-item, .group-item');
    
    chatItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
}

function searchUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
    const userItems = document.querySelectorAll('#searchUsersList .search-user-item');
    
    userItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
}

function searchGroupMembers() {
    const searchTerm = document.getElementById('groupMemberSearch').value.toLowerCase();
    const userItems = document.querySelectorAll('#groupMembersList .search-user-item');
    
    userItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
}

// Emoji Functions
function populateEmojis() {
    const emojiPicker = document.getElementById('emojiPicker');
    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'];
    
    emojis.forEach(emoji => {
        const emojiElement = document.createElement('span');
        emojiElement.className = 'emoji';
        emojiElement.textContent = emoji;
        emojiElement.onclick = () => insertEmoji(emoji);
        emojiPicker.appendChild(emojiElement);
    });
}

function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emojiPicker');
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
}

function insertEmoji(emoji) {
    const messageInput = document.getElementById('messageInput');
    messageInput.value += emoji;
    messageInput.focus();
}

// Utility Functions
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
        return 'now';
    } else if (diff < 3600000) { // Less than 1 hour
        return Math.floor(diff / 60000) + 'm';
    } else if (diff < 86400000) { // Less than 1 day
        return Math.floor(diff / 3600000) + 'h';
    } else {
        return date.toLocaleDateString();
    }
}

function showLoadingIndicator(show = true) {
    document.getElementById('loadingIndicator').style.display = show ? 'flex' : 'none';
}

// Make functions globally available
window.loginUser = loginUser;
window.signupUser = signupUser;
window.logoutUser = logoutUser;
window.showLoginForm = showLoginForm;
window.showSignupForm = showSignupForm;
window.showTab = showTab;
window.showProfileModal = showProfileModal;
window.showNewChatModal = showNewChatModal;
window.showNewGroupModal = showNewGroupModal;
window.closeModal = closeModal;
window.updateProfile = updateProfile;
window.createGroup = createGroup;
window.sendMessage = sendMessage;
window.handleMessageKeyPress = handleMessageKeyPress;
window.searchChats = searchChats;
window.searchUsers = searchUsers;
window.searchGroupMembers = searchGroupMembers;
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmoji = insertEmoji;
window.toggleGroupMember = toggleGroupMember;
