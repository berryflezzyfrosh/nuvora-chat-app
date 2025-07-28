// Global variables
let currentUser = null;
let currentChat = null;
let users = [];
let groups = [];
let chats = [];
let messages = {};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadStoredData();
    setupEventListeners();
    populateEmojis();
    
    // Check if user is logged in
    if (currentUser) {
        showChatApp();
    } else {
        showAuthScreen();
    }
}

function loadStoredData() {
    // Load from localStorage (simulating persistent storage)
    const storedUser = localStorage.getItem('nuvoraCurrentUser');
    const storedUsers = localStorage.getItem('nuvoraUsers');
    const storedGroups = localStorage.getItem('nuvoraGroups');
    const storedChats = localStorage.getItem('nuvoraChats');
    const storedMessages = localStorage.getItem('nuvoraMessages');
    
    if (storedUser) currentUser = JSON.parse(storedUser);
    if (storedUsers) users = JSON.parse(storedUsers);
    if (storedGroups) groups = JSON.parse(storedGroups);
    if (storedChats) chats = JSON.parse(storedChats);
    if (storedMessages) messages = JSON.parse(storedMessages);
    
    
}

function saveData() {
    localStorage.setItem('nuvoraCurrentUser', JSON.stringify(currentUser));
    localStorage.setItem('nuvoraUsers', JSON.stringify(users));
    localStorage.setItem('nuvoraGroups', JSON.stringify(groups));
    localStorage.setItem('nuvoraChats', JSON.stringify(chats));
    localStorage.setItem('nuvoraMessages', JSON.stringify(messages));
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
}

function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('chatApp').style.display = 'none';
}

function showChatApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('chatApp').style.display = 'flex';
    
    if (currentUser) {
        updateUserProfile();
        loadUsers();
        loadGroups();
        loadChats();
    }
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    
    // Find user in stored users
    const user = users.find(u => u.phone === phone && u.password === password);
    
    if (user) {
        currentUser = user;
        currentUser.online = true;
        currentUser.lastSeen = new Date().toISOString();
        saveData();
        showChatApp();
    } else {
        alert('Invalid phone number or password');
    }
}

function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const country = document.getElementById('registerCountry').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Check if user already exists
    if (users.find(u => u.phone === phone)) {
        alert('User with this phone number already exists');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        name,
        phone,
        country,
        password,
        profilePic: '',
        online: true,
        lastSeen: new Date().toISOString()
    };
    
    users.push(newUser);
    currentUser = newUser;
    saveData();
    showChatApp();
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
            currentUser.profilePic = e.target.result;
            document.getElementById('userProfilePic').src = currentUser.profilePic;
            document.getElementById('userProfilePic').style.display = 'block';
            saveData();
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
    
    users.filter(user => user.id !== currentUser.id).forEach(user => {
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
    
    groups.filter(group => group.members.includes(currentUser.id)).forEach(group => {
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
    
    chats.filter(chat => 
        chat.participants.includes(currentUser.id)
    ).forEach(chat => {
        const chatElement = createChatElement(chat);
        chatsList.appendChild(chatElement);
    });
}

function createChatElement(chat) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    chatDiv.onclick = () => openExistingChat(chat);
    
    const otherParticipant = chat.type === 'user' ? 
        users.find(u => u.id === chat.participants.find(p => p !== currentUser.id)) :
        groups.find(g => g.id === chat.groupId);
    
    const name = otherParticipant ? otherParticipant.name : 'Unknown';
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

function startChat(target, type) {
    let chatId;
    
    if (type === 'user') {
        // Find existing chat or create new one
        chatId = `${Math.min(currentUser.id, target.id)}_${Math.max(currentUser.id, target.id)}`;
        
        let existingChat = chats.find(c => c.id === chatId);
        if (!existingChat) {
            existingChat = {
                id: chatId,
                type: 'user',
                participants: [currentUser.id, target.id],
                lastMessage: '',
                lastMessageTime: new Date().toISOString()
            };
            chats.push(existingChat);
        }
        
        currentChat = {
            ...existingChat,
            name: target.name,
            profilePic: target.profilePic,
            status: target.online ? 'Online' : `Last seen ${formatTime(target.lastSeen)}`
        };
    } else if (type === 'group') {
        currentChat = {
            id: target.id,
            type: 'group',
            name: target.name,
            profilePic: '',
            status: `${target.members.length} members`,
            groupId: target.id
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
                status: otherUser.online ? 'Online' : `Last seen ${formatTime(otherUser.lastSeen)}`
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
    
    // Mark items as active
    document.querySelectorAll('.user-item, .group-item, .chat-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.user-item, .group-item, .chat-item')?.classList.add('active');
}

function loadMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    const chatMessages = messages[currentChat.id] || [];
    
    chatMessages.forEach(message => {
        const messageElement = createMessageElement(message);
        container.appendChild(messageElement);
    });
    
    container.scrollTop = container.scrollHeight;
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

function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !currentChat) return;
    
    const message = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        content: content,
        timestamp: new Date().toISOString()
    };
    
    // Add message to messages
    if (!messages[currentChat.id]) {
        messages[currentChat.id] = [];
    }
    messages[currentChat.id].push(message);
    
    // Update chat last message
    const chatIndex = chats.findIndex(c => c.id === currentChat.id);
    if (chatIndex !== -1) {
        chats[chatIndex].lastMessage = content;
        chats[chatIndex].lastMessageTime = message.timestamp;
    }
    
    // Save data
    saveData();
    
    // Update UI
    const messageElement = createMessageElement(message);
    document.getElementById('messagesContainer').appendChild(messageElement);
    document.getElementById('messagesContainer').scrollTop = document.getElementById('messagesContainer').scrollHeight;
    
    // Clear input
    input.value = '';
    
    // Simulate response for demo
    if (currentChat.type === 'user') {
        setTimeout(() => simulateResponse(), 1000 + Math.random() * 2000);
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
    
    users.filter(user => user.id !== currentUser.id).forEach(user => {
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

function createGroup() {
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
        id: Date.now().toString(),
        name: name,
        description: description,
        members: [currentUser.id, ...selectedUsers],
        createdBy: currentUser.id,
        createdAt: new Date().toISOString()
    };
    
    groups.push(group);
    
    // Create chat for the group
    const groupChat = {
        id: group.id,
        type: 'group',
        participants: group.members,
        groupId: group.id,
        lastMessage: '',
        lastMessageTime: new Date().toISOString()
    };
    
    chats.push(groupChat);
    saveData();
    
    closeCreateGroup();
    loadGroups();
    
    alert('Group created successfully!');
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    
    // Search in current tab
    const activeTab = document.querySelector('.tab-btn.active').textContent.toLowerCase();
    
    if (activeTab === 'users') {
        document.querySelectorAll('.user-item').forEach(item => {
            const name = item.querySelector('.user-name').textContent.toLowerCase();
           
           
           
           
           
            elector('.user-country').textContent.toLowerCase();
            item.style.display = (name.includes(query) || country.includes(query)) ? 'block' : 'none';
        });
    } else if (activeTab === 'groups') {
        document.querySelectorAll('.group-item').forEach(item => {
            const name = item.querySelector('.group-name').textContent.toLowerCase();
            item.style.display = name.includes(query) ? 'block' : 'none';
        });
    } else if (activeTab === 'chats') {
        document.querySelectorAll('.chat-item').forEach(item => {
            const name = item.querySelector('.chat-name').textContent.toLowerCase();
            item.style.display = name.includes(query) ? 'block' : 'none';
        });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser.online = false;
        currentUser.lastSeen = new Date().toISOString();
        saveData();
        
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
        '👄', '💋', '🩸', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨',
        '🧔', '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁',
        '🙋', '🧏', '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '🥷', '👷',
        '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼'
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

// Update online status periodically
setInterval(() => {
    if (currentUser) {
        currentUser.lastSeen = new Date().toISOString();
        saveData();
    }
}, 30000); // Update every 30 seconds

// Simulate other users going online/offline
setInterval(() => {
    users.forEach(user => {
        if (user.id !== currentUser?.id) {
            // Random chance to change online status
            if (Math.random() < 0.1) {
                user.online = !user.online;
                user.lastSeen = new Date().toISOString();
            }
        }
    });
    saveData();
    
    // Refresh current tab if users tab is active
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.textContent.toLowerCase() === 'users') {
        loadUsers();
    }
}, 10000); // Check every 10 seconds

// Handle window focus/blur for online status
window.addEventListener('focus', () => {
    if (currentUser) {
        currentUser.online = true;
        currentUser.lastSeen = new Date().toISOString();
        saveData();
    }
});

window.addEventListener('blur', () => {
    if (currentUser) {
        currentUser.online = false;
        currentUser.lastSeen = new Date().toISOString();
        saveData();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        currentUser.online = false;
        currentUser.lastSeen = new Date().toISOString();
        saveData();
    }
});

// Auto-resize message input
document.getElementById('messageInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Handle file uploads (for future implementation)
function handleFileUpload() {
    // This function can be expanded to handle file uploads
    // For now, it's just a placeholder
    console.log('File upload functionality to be implemented');
}

// Notification system (basic implementation)
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Initialize notification styles
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    }
    
    .notification.info {
        background-color: #3b82f6;
    }
    
    .notification.success {
        background-color: #10b981;
    }
    
    .notification.error {
        background-color: #ef4444;
    }
    
    .notification.warning {
        background-color: #f59e0b;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

// Add notification styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        showNotification,
        formatTime
    };
}


            
            
            
            
            