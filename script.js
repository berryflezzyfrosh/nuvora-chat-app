// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC7bFhndsJ_ax6U466E4xkv0SbXCdp1IGQ",
    authDomain: "nuvora-chat-app.firebaseapp.com",
    databaseURL: "https://nuvora-chat-app-default-rtdb.firebaseio.com",
    projectId: "nuvora-chat-app.firebasestorage.app",
    storageBucket: "nuvora-chat-app.appspot.com",
    messagingSenderId: "764236230983",
    appId: "1:764236230983:web:d3dcc8f0b53e8c9ad59c62"
};
 // Initialize Firebase
 firebase.initializeApp(firebaseConfig);
  const database = firebase.database();

// Global variables
let currentUser = null;
let currentChat = null;
let users = [];
let groups = [];
let chats = [];
let messages = {};
let userListeners = [];
let messageListeners = [];

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

function showLoadingIndicator(show = true) {
    document.getElementById('loadingIndicator').style.display = show ? 'flex' : 'none';
}

function setupRealTimeListeners() {
    // Listen for all users
    database.ref('users').on('value', (snapshot) => {
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
        database.ref('chats').orderByChild('participants').on('value', (snapshot) => {
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
        database.ref('groups').on('value', (snapshot) => {
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
        database.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                database.ref(`users/${currentUser.firebaseKey}/online`).onDisconnect().set(false);
                database.ref(`users/${currentUser.firebaseKey}/lastSeen`).onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
            }
        });
    }
}

function updateUserOnlineStatus(online) {
    if (currentUser && currentUser.firebaseKey) {
        database.ref(`users/${currentUser.firebaseKey}`).update({
            online: online,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

function setupEventListeners() {
    // Auth forms
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    
    // Message input
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Profile picture input
    document.getElementById('profilePicInput').addEventListener('change', handleProfilePicChange);

    // Window events for online status
    window.addEventListener('beforeunload', () => {
        updateUserOnlineStatus(false);
    });

    window.addEventListener('focus', () => {
        updateUserOnlineStatus(true);
    });

    window.addEventListener('blur', () => {
        updateUserOnlineStatus(false);
    });
}

function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('chatApp').style.display = 'none';
    showLoadingIndicator(false);
}

function showChatApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('chatApp').style.display = 'flex';
    
    if (currentUser) {
        updateUserProfile();
        setupRealTimeListeners();
    }
    showLoadingIndicator(false);
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    showLoadingIndicator(true);
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        // Query Firebase for user with this phone number
        const snapshot = await database.ref('users').orderByChild('phone').equalTo(phone).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            const userKey = Object.keys(userData)[0];
            const user = userData[userKey];
            
            if (user.password === password) {
                currentUser = { ...user, firebaseKey: userKey };
                localStorage.setItem('nuvoraCurrentUser', JSON.stringify(currentUser));
                showChatApp();
                return;
            }
        }
        
        alert('Invalid phone number or password');
        showLoadingIndicator(false);
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
        showLoadingIndicator(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showLoadingIndicator(true);
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const country = document.getElementById('registerCountry').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        showLoadingIndicator(false);
        return;
    }
    
    try {
        // Check if user already exists
        const snapshot = await database.ref('users').orderByChild('phone').equalTo(phone).once('value');
        if (snapshot.exists()) {
            alert('User with this phone number already exists');
            showLoadingIndicator(false);
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
            name,
            phone,
            country,
            password,
            profilePic: '',
            online: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Save to Firebase
        const userRef = await database.ref('users').push(newUser);
        currentUser = { ...newUser, firebaseKey: userRef.key };
        
        localStorage.setItem('nuvoraCurrentUser', JSON.stringify(currentUser));
        showChatApp();
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
        showLoadingIndicator(false);
    }
}

function updateUserProfile() {
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('currentUserCountry').textContent = currentUser.country;
    
    if (currentUser.profilePic) {
        document.getElementById('userProfilePic').src = currentUser.profilePic;
        document.getElementById('userProfilePic').style.display = 'block';
    } else {
        document.getElementById('userProfilePic').style.display = 'none';
    }
}

function changeProfilePic() {
    document.getElementById('profilePicInput').click();
}

function handleProfilePicChange(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const profilePic = e.target.result;
            
            // Update in Firebase
            database.ref(`users/${currentUser.firebaseKey}`).update({
                profilePic: profilePic
            });
            
            // Update locally
            currentUser.profilePic = profilePic;
            document.getElementById('userProfilePic').src = profilePic;
            document.getElementById('userProfilePic').style.display = 'block';
            
            localStorage.setItem('nuvoraCurrentUser', JSON.stringify(currentUser));
        };
        reader.readAsDataURL(file);
    }
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').style.display = 'block';
    event.target.classList.add('active');
    
    // Load content based on tab
    if (tabName === 'users') loadUsers();
    else if (tabName === 'groups') loadGroups();
    else if (tabName === 'chats') loadChats();
}

function loadUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    // Filter out current user and show all other users
    const otherUsers = users.filter(user => user.id !== currentUser.id);
    
    if (otherUsers.length === 0) {
        usersList.innerHTML = '<div class="no-users">No other users online yet</div>';
        return;
    }
    
    otherUsers.forEach(user => {
        const userElement = createUserElement(user);
        usersList.appendChild(userElement);
    });
}

function createUserElement(user) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.onclick = () => startChat(user, 'user');
    
    const avatar = user.profilePic ? 
        `<img src="${user.profilePic}" alt="${user.name}" class="user-avatar">` :
        `<div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>`;
    
    const onlineStatus = user.online ? 
        '<div class="online-indicator"></div>' : '';
    
    userDiv.innerHTML = `
        <div style="position: relative;">
            ${avatar}
            ${onlineStatus}
        </div>
        <div class="user-details">
            <div class="user-name">${user.name}</div>
            <div class="user-country">${user.country}</div>
        </div>
    `;
    
    return userDiv;
}

function loadGroups() {
    const groupsList = document.getElementById('groupsList');
    groupsList.innerHTML = '';
    
    groups.forEach(group => {
        const groupElement = createGroupElement(group);
        groupsList.appendChild(groupElement);
    });
}

function createGroupElement(group) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-item';
    groupDiv.onclick = () => startChat(group, 'group');
    
    groupDiv.innerHTML = `
        <div class="group-avatar">👥</div>
        <div class="group-details">
            <div class="group-name">${group.name}</div>
            <div class="group-members">${group.members.length} members</div>
        </div>
    `;
    
    return groupDiv;
}

function loadChats() {
    const chatsList = document.getElementById('chatsList');
    chatsList.innerHTML = '';
    
    if (chats.length === 0) {
        chatsList.innerHTML = '<div class="no-chats">No chats yet</div>';
        return;
    }
    
    chats.forEach(chat => {
        const chatElement = createChatElement(chat);
        chatsList.appendChild(chatElement);
    });
}

function createChatElement(chat) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    chatDiv.onclick = () => openExistingChat(chat);
    
    let name = 'Unknown';
    if (chat.type === 'user') {
        const otherUser = users.find(u => u.id === chat.participants.find(p => p !== currentUser.id));
        name = otherUser ? otherUser.name : 'Unknown User';
    } else if (chat.type === 'group') {
        const group = groups.find(g => g.id === chat.groupId);
        name = group ? group.name : 'Unknown Group';
    }
    
    const lastMessage = chat.lastMessage || 'No messages yet';
    
    chatDiv.innerHTML = `
        <div class="chat-avatar">${name.charAt(0).toUpperCase()}</div>
        <div class="chat-details">
            <div class="chat-name">${name}</div>
            <div class="chat-preview">${lastMessage}</div>
        </div>
    `;
    
    return chatDiv;
}

async function startChat(target, type) {
    let chatId;
    
    if (type === 'user') {
        // Create chat ID based on user IDs
        chatId = [currentUser.id, target.id].sort().join('_');
        
        // Check if chat already exists
        const chatSnapshot = await database.ref('chats').orderByChild('id').equalTo(chatId).once('value');
        let existingChat = null;
        
        if (chatSnapshot.exists()) {
            const chatData = chatSnapshot.val();
            const chatKey = Object.keys(chatData)[0];
            existingChat = { ...chatData[chatKey], firebaseKey: chatKey };
        } else {
            // Create new chat
            const newChat = {
                id: chatId,
                type: 'user',
                participants: [currentUser.id, target.id],
                lastMessage: '',
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            const chatRef = await database.ref('chats').push(newChat);
            existingChat = { ...newChat, firebaseKey: chatRef.key };
        }
        
        currentChat = {
            ...existingChat,
            name: target.name,
            profilePic: target.profilePic,
            status: target.online ? 'Online' : 'Offline'
        };
    } else if (type === 'group') {
        currentChat = {
            id: target.id,
            type: 'group',
            name: target.name,
            profilePic: '',
            status: `${target.members.length} members`,
            groupId: target.id,
            firebaseKey: target.firebaseKey
        };
    }
    
    openChat();
}

function openExistingChat(chat) {
    if (chat.type === 'user') {
        const otherUser = users.find(u => u.id === chat.participants.find(p => p !== currentUser.id));
        if (otherUser) {
            currentChat = {
                ...chat,
                name: otherUser.name,
                profilePic: otherUser.profilePic,
                status: otherUser.online ? 'Online' : 'Offline'
            };
        }
    } else if (chat.type === 'group') {
        const group = groups.find(g => g.id === chat.groupId);
        if (group) {
            currentChat = {
                ...chat,
                name: group.name,
                profilePic: '',
                status: `${group.members.length} members`
            };
        }
    }
    
    openChat();
}

function openChat() {
    // Hide sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').style.display = 'none';
        document.getElementById('chatArea').style.display = 'flex';
    }
    
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'flex';
    
    // Update chat header
    document.getElementById('chatName').textContent = currentChat.name;
    document.getElementById('chatStatus').textContent = currentChat.status;
    
    if (currentChat.profilePic) {
        document.getElementById('chatProfilePic').src = currentChat.profilePic;
        document.getElementById('chatProfilePic').style.display = 'block';
    } else {
        document.getElementById('chatProfilePic').style.display = 'none';
    }
    
    // Load messages
    loadMessages();
}

function closeChatScreen() {
    // Show sidebar and hide chat on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').style.display = 'flex';
        document.getElementById('chatArea').style.display = 'none';
    }
    
    document.getElementById('chatScreen').style.display = 'none';
    document.getElementById('welcomeScreen').style.display = 'flex';
    
    // Remove message listener
    if (currentChat && currentChat.id) {
        database.ref(`messages/${currentChat.id}`).off();
    }
    
    currentChat = null;
}

function loadMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    if (!currentChat || !currentChat.id) return;
    
    // Listen for messages in real-time
    database.ref(`messages/${currentChat.id}`).on('value', (snapshot) => {
        container.innerHTML = '';
        const messagesData = snapshot.val();
        
        if (messagesData) {
            const messagesList = Object.keys(messagesData).map(key => ({
                ...messagesData[key],
                firebaseKey: key
            })).sort((a, b) => a.timestamp - b.timestamp);
            
            messagesList.forEach(message => {
                const messageElement = createMessageElement(message);
                container.appendChild(messageElement);
            });
        }
        
        container.scrollTop = container.scrollHeight;
    });
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser.id ? 'sent' : 'received'}`;
    
    const senderName = message.senderId === currentUser.id ? 'You' : 
        (users.find(u => u.id === message.senderId)?.name || 'Unknown');
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-content">${message.content}</div>
            <div class="message-meta">
                <span class="message-time">${formatTime(message.timestamp)}</span>
            </div>
        </div>
    `;
    
    return messageDiv;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !currentChat) return;
    
    const message = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        senderId: currentUser.id,
        senderName: currentUser.name,
        content: content,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        // Save message to Firebase
        await database.ref(`messages/${currentChat.id}`).push(message);
        
        // Update chat last message
        if (currentChat.firebaseKey) {
            await database.ref(`chats/${currentChat.firebaseKey}`).update({
                lastMessage: content,
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        // Clear input
        input.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}

function showCreateGroup() {
    document.getElementById('createGroupModal').style.display = 'flex';
    loadAvailableUsers();
}

function closeCreateGroup() {
    document.getElementById('createGroupModal').style.display = 'none';
    document.getElementById('groupName').value = '';
    document.getElementById('groupDescription').value = '';
}

function loadAvailableUsers() {
    const container = document.getElementById('availableUsers');
    container.innerHTML = '';
    
    const otherUsers = users.filter(user => user.id !== currentUser.id);
    
    otherUsers.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-checkbox';
        
        userDiv.innerHTML = `
            <input type="checkbox" id="user_${user.id}" value="${user.id}">
            <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <label for="user_${user.id}">${user.name} (${user.country})</label>
        `;
        
        container.appendChild(userDiv);
    });
}

async function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    
    if (!name) {
        alert('Please enter a group name');
        return;
    }
    
    const selectedUsers = Array.from(document.querySelectorAll('#availableUsers input:checked'))
        .map(input => input.value);
    
    if (selectedUsers.length === 0) {
        alert('Please select at least one member');
        return;
    }
    
    const group = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        name: name,
        description: description,
        members: [currentUser.id, ...selectedUsers],
        createdBy: currentUser.id,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        // Save group to Firebase
        const groupRef = await database.ref('groups').push(group);
        
        // Create chat for the group
        const groupChat = {
            id: group.id,
            type: 'group',
            participants: group.members,
            groupId: group.id,
            lastMessage: '',
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref('chats').push(groupChat);
        
        closeCreateGroup();
        alert('Group created successfully!');
    } catch (error) {
        console.error('Error creating group:', error);
        alert('Failed to create group. Please try again.');
    }
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    // Search in current tab
    const activeTab = document.querySelector('.tab-btn.active').textContent.toLowerCase();
    
    if (activeTab === 'users') {
        document.querySelectorAll('.user-item').forEach(item => {
            const name = item.querySelector('.user-name')?.textContent.toLowerCase() || '';
            const country = item.querySelector('.user-country')?.textContent.toLowerCase() || '';
            item.style.display = (name.includes(query) || country.includes(query)) ? 'block' : 'none';
        });
    } else if (activeTab === 'groups') {
        document.querySelectorAll('.group-item').forEach(item => {
            const name = item.querySelector('.group-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(query) ? 'block' : 'none';
        });
    } else if (activeTab === 'chats') {
        document.querySelectorAll('.chat-item').forEach(item => {
            const name = item.querySelector('.chat-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(query) ? 'block' : 'none';
        });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        updateUserOnlineStatus(false);
        
        // Remove all listeners
        database.ref('users').off();
        database.ref('chats').off();
        database.ref('groups').off();
        if (currentChat && currentChat.id) {
            database.ref(`messages/${currentChat.id}`).off();
        }
        
        currentUser = null;
        currentChat = null;
        
        localStorage.removeItem('nuvoraCurrentUser');
        showAuthScreen();
    }
}

function showChatInfo() {
    if (!currentChat) return;
    
    let info = `Chat: ${currentChat.name}\n`;
    info += `Type: ${currentChat.type}\n`;
    
    if (currentChat.type === 'group') {
        const group = groups.find(g => g.id === currentChat.groupId);
        if (group) {
            info += `Members: ${group.members.length}\n`;
            info += `Created: ${formatTime(group.createdAt)}\n`;
            if (group.description) {
                info += `Description: ${group.description}`;
            }
        }
    } else {
        info += `Status: ${currentChat.status}`;
    }
    
    alert(info);
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function populateEmojis() {
    const emojiGrid = document.querySelector('.emoji-grid');
    const emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
        '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
        '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
        '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
        '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
        '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
        '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
        '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
        '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
        '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞',
        '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
        '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
        '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
        '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅',
        '👄', '💋', '🩸'
    ];
    
    emojis.forEach(emoji => {
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'emoji-btn';
        emojiBtn.textContent = emoji;
        emojiBtn.onclick = () => insertEmoji(emoji);
        emojiGrid.appendChild(emojiBtn);
    });
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
    document.getElementById('emojiPicker').style.display = 'none';
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) {
        return 'Just now';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diffInMinutes / 1440);
        if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}

// Close emoji picker when clicking outside
document.addEventListener('click', function(e) {
    const emojiPicker = document.getElementById('emojiPicker');
    const emojiBtn = document.querySelector('.input-btn');
    
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
    }
});

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('createGroupModal');
    if (e.target === modal) {
        closeCreateGroup();
    }
});

// Handle window resize for responsive design
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').style.display = 'flex';
        document.getElementById('chatArea').style.display = 'flex';
    }
});
