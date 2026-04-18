document.addEventListener('DOMContentLoaded', () => {
    const contactsList = document.getElementById('chats-list');
    const addcontact = document.getElementById('new-contact');
    const myName = document.getElementById('myname');
    const profileImage = document.getElementById('profile-image');
    const activeChatAvatar = document.getElementById('active-chat-avatar');
    const deleteAccount = document.getElementById('deleteAccount');
    const form = document.getElementById('message-form');
    const input = document.getElementById('message-input');
    const messagesContainer = document.getElementById('chat-messages');
    const clearChat = document.getElementById('clear-chat');
    const deleteContact = document.getElementById('delete-contact');
    const searchInput = document.getElementById('search-input');
    const emptyState = document.getElementById('default-image');

    const socket = io();
    let activeContact = null;
    let currentUserPhone = null;
    let contactsCache = [];
    const onlineStatus = {};

    function avatarUrl(seed) {
        return `https://robohash.org/${encodeURIComponent(seed || 'webchat-user')}.png?set=set4&size=128x128`;
    }

    function formatTime(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async function setCurrentUser() {
        try {
            const response = await fetch('/currentUser', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/Login';
                }
                throw new Error('Failed to fetch current user');
            }

            const data = await response.json();
            currentUserPhone = data.phone;
            myName.innerText = data.username;
            profileImage.src = avatarUrl(data.phone || data.username);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }

    addcontact.addEventListener('click', () => {
        window.location.href = '/addcontact';
    });

    searchInput.addEventListener('input', () => {
        renderContacts(contactsCache, searchInput.value);
    });

    deleteAccount.addEventListener('click', async () => {
        const confirmation = confirm('Are you sure you want to delete your account permanently? This action cannot be undone.');

        if (!confirmation) {
            return;
        }

        try {
            const response = await fetch('/deleteAccount', {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                alert('Your account has been deleted successfully.');
                window.location.href = '/';
            } else {
                const errorMessage = await response.text();
                alert('Failed to delete account: ' + errorMessage);
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('An error occurred while deleting your account. Please try again.');
        }
    });

    clearChat.addEventListener('click', async () => {
        if (!activeContact) {
            alert('Please select a contact first.');
            return;
        }

        const confirmation = confirm('Are you sure you want to clear this chat?');
        if (!confirmation) {
            return;
        }

        try {
            const response = await fetch('/clearChat', {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contactPhoneNumber: activeContact.phone }),
            });

            if (response.ok) {
                messagesContainer.innerHTML = '';
                alert('Chat cleared successfully!');
            } else {
                const errorMessage = await response.text();
                alert('Failed to clear chat: ' + errorMessage);
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            alert('Error clearing chat. Please try again later.');
        }
    });

    deleteContact.addEventListener('click', async () => {
        if (!activeContact) {
            alert('Please select a contact first.');
            return;
        }

        const confirmation = confirm('Are you sure you want to delete this contact?');
        if (!confirmation) {
            return;
        }

        try {
            const response = await fetch('/deleteContact', {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contactPhoneNumber: activeContact.phone }),
            });

            if (response.ok) {
                contactsCache = contactsCache.filter(contact => contact.phone !== activeContact.phone);
                renderContacts(contactsCache, searchInput.value);
                messagesContainer.innerHTML = '';
                document.getElementById('Window_User').innerText = 'Select a contact';
                document.getElementById('numb').innerText = 'No active chat';
                activeChatAvatar.src = avatarUrl('webchat-default');
                activeContact = null;
                emptyState.style.display = 'flex';
                alert('Contact deleted successfully!');
            } else {
                const errorMessage = await response.text();
                alert('Failed to delete contact: ' + errorMessage);
            }
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Error deleting contact. Please try again later.');
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!activeContact) {
            alert('Please select a contact before sending a message.');
            return;
        }

        const message = input.value.trim();
        if (!message) {
            return;
        }

        socket.emit('private message', {
            toPhoneNumber: activeContact.phone,
            message
        });
        input.value = '';
    });

    socket.on('chat message', (msg) => {
        if (!activeContact) {
            return;
        }

        const belongsToActiveChat = msg.fromPhone === activeContact.phone || msg.toPhoneNumber === activeContact.phone;
        if (!belongsToActiveChat) {
            return;
        }

        appendMessage({
            message: msg.message,
            className: msg.fromPhone === currentUserPhone ? 'message-sent' : 'message-received',
            timestamp: new Date()
        });
    });

    socket.on('user status', ({ phone, status }) => {
        onlineStatus[phone] = status;
        const statusText = document.querySelector(`[data-status-text="${phone}"]`);
        const statusDot = document.querySelector(`[data-status-dot="${phone}"]`);

        if (statusText) {
            statusText.textContent = status;
        }

        if (statusDot) {
            statusDot.classList.toggle('online', status === 'online');
        }

        if (activeContact && activeContact.phone === phone) {
            document.getElementById('numb').innerText = `${phone} • ${status}`;
        }
    });

    socket.on('message error', (message) => {
        alert(message);
    });

    async function fetchContacts() {
        try {
            const response = await fetch('/Usrcontacts', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Unauthorized! Please log in again.');
                    window.location.href = '/Login';
                    return;
                }
                throw new Error('Failed to fetch contacts.');
            }

            contactsCache = await response.json();
            renderContacts(contactsCache);
            fetchOnlineStatus(contactsCache);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            alert('Error fetching contacts. Please try again.');
        }
    }

    async function fetchOnlineStatus(contacts) {
        if (!contacts.length) {
            return;
        }

        const query = contacts
            .map(contact => `contacts=${encodeURIComponent(contact.phone)}`)
            .join('&');

        try {
            const response = await fetch(`/onlineStatus?${query}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                return;
            }

            const statusMap = await response.json();
            Object.assign(onlineStatus, statusMap);
            renderContacts(contactsCache, searchInput.value);
        } catch (error) {
            console.error('Error fetching online status:', error);
        }
    }

    function renderContacts(contacts, searchTerm = '') {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const filteredContacts = contacts.filter(contact => {
            const name = String(contact.username || '').toLowerCase();
            const phone = String(contact.phone || '').toLowerCase();
            return name.includes(normalizedSearch) || phone.includes(normalizedSearch);
        });

        contactsList.innerHTML = '';

        if (filteredContacts.length === 0) {
            contactsList.innerHTML = '<div class="no-contacts">No contacts found.</div>';
            return;
        }

        filteredContacts.forEach(contact => {
            const chatTile = createChatTile(contact);
            contactsList.appendChild(chatTile);
        });
    }

    function createChatTile(contact) {
        const chatTile = document.createElement('button');
        chatTile.type = 'button';
        chatTile.classList.add('chat-tile');
        chatTile.setAttribute('data-phone', contact.phone);

        if (activeContact && activeContact.phone === contact.phone) {
            chatTile.classList.add('active');
        }

        const avatar = document.createElement('img');
        avatar.classList.add('chat-tile-avatar');
        avatar.alt = `${contact.username}'s cartoon animal avatar`;
        avatar.src = avatarUrl(contact.phone || contact.username);

        const details = document.createElement('div');
        details.classList.add('chat-tile-details');

        const title = document.createElement('div');
        title.classList.add('chat-tile-title');

        const name = document.createElement('span');
        name.textContent = contact.username;

        const badge = document.createElement('span');
        badge.textContent = 'Chat';

        const subtitle = document.createElement('div');
        subtitle.classList.add('chat-tile-subtitle');

        const statusDot = document.createElement('span');
        statusDot.classList.add('status-dot');
        statusDot.dataset.statusDot = contact.phone;

        const currentStatus = onlineStatus[contact.phone] || 'offline';
        statusDot.classList.toggle('online', currentStatus === 'online');

        const statusText = document.createElement('span');
        statusText.dataset.statusText = contact.phone;
        statusText.textContent = currentStatus;

        title.appendChild(name);
        title.appendChild(badge);
        subtitle.appendChild(statusDot);
        subtitle.appendChild(statusText);
        details.appendChild(title);
        details.appendChild(subtitle);
        chatTile.appendChild(avatar);
        chatTile.appendChild(details);

        chatTile.addEventListener('click', () => handleChatClick(contact));

        return chatTile;
    }

    async function handleChatClick(contact) {
        activeContact = contact;

        const chatPerson = document.getElementById('Window_User');
        const numb = document.getElementById('numb');

        emptyState.style.display = 'none';
        chatPerson.innerText = contact.username;
        numb.innerText = `${contact.phone} • ${onlineStatus[contact.phone] || 'offline'}`;
        activeChatAvatar.src = avatarUrl(contact.phone || contact.username);

        renderContacts(contactsCache, searchInput.value);

        if (!currentUserPhone) {
            await setCurrentUser();
        }

        await fetchMessages(currentUserPhone, contact.phone);
    }

    async function fetchMessages(fromPhone, toPhone) {
        if (!fromPhone || !toPhone) {
            return;
        }

        try {
            const response = await fetch(`/messages/${encodeURIComponent(fromPhone)}/${encodeURIComponent(toPhone)}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const messages = await response.json();
            renderMessages(messages, fromPhone);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    function renderMessages(messages, userPhone) {
        messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            appendMessage({
                message: msg.message,
                className: msg.sender === userPhone ? 'message-sent' : 'message-received',
                timestamp: msg.createdAt || msg.timestamp
            });
        });

        scrollToBottom();
    }

    function appendMessage({ message, className, timestamp }) {
        const newMessage = document.createElement('div');
        newMessage.classList.add('message', className);

        const text = document.createElement('div');
        text.classList.add('message-text');
        text.innerText = message;

        const meta = document.createElement('div');
        meta.classList.add('message-meta');
        meta.innerText = formatTime(timestamp);

        newMessage.appendChild(text);
        if (meta.innerText) {
            newMessage.appendChild(meta);
        }

        messagesContainer.appendChild(newMessage);
        scrollToBottom();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function initialize() {
        profileImage.src = avatarUrl('webchat-user');
        await setCurrentUser();
        await fetchContacts();
    }

    initialize();
});
