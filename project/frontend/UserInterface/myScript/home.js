document.addEventListener('DOMContentLoaded', () => {
    const contactsList = document.getElementById('chats-list');
    const addcontact = document.getElementById('new-contact');
    const myName = document.getElementById('myname');
    const profileImage = document.getElementById('profile-image');
    const activeChatAvatar = document.getElementById('active-chat-avatar');
    const deleteAccount = document.getElementById('deleteAccount');
    const form = document.getElementById('message-form');
    const input = document.getElementById('message-input');
    const messageTypeInput = document.getElementById('message-type');
    const messagesContainer = document.getElementById('chat-messages');
    const chatScroller = document.querySelector('.chat-main');
    const clearChat = document.getElementById('clear-chat');
    const deleteContact = document.getElementById('delete-contact');
    const searchInput = document.getElementById('search-input');
    const emptyState = document.getElementById('default-image');
    const openProfile = document.getElementById('open-profile');
    const profileModal = document.getElementById('profile-modal');
    const closeProfile = document.getElementById('close-profile');
    const profilePreview = document.getElementById('profile-preview');
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const regenerateAvatar = document.getElementById('regenerate-avatar');
    const profileFields = {
        username: document.getElementById('profile-username'),
        email: document.getElementById('profile-email'),
        gender: document.getElementById('profile-gender'),
        age: document.getElementById('profile-age'),
        avatarSeed: document.getElementById('profile-avatar-seed')
    };

    const socket = io();
    let activeContact = null;
    let currentUserPhone = null;
    let currentUser = null;
    let contactsCache = [];
    let summaries = {};
    const onlineStatus = {};
    let typingTimer;

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

        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function previewText(summary) {
        if (!summary || !summary.lastMessage) {
            return 'No messages yet';
        }

        if (summary.lastMessage.type === 'image') {
            return 'Image';
        }

        if (summary.lastMessage.type === 'file') {
            return 'File';
        }

        return summary.lastMessage.message || 'Message';
    }

    async function setCurrentUser() {
        try {
            const response = await fetch('/currentUser', { method: 'GET', credentials: 'include' });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/Login';
                }
                throw new Error('Failed to fetch current user');
            }

            const data = await response.json();
            currentUserPhone = data.phone;
            currentUser = data;
            myName.innerText = data.username;
            profileImage.src = avatarUrl(data.avatarSeed || data.phone || data.username);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }

    async function loadProfile() {
        const response = await fetch('/profile', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to load profile');
        }

        const profile = await response.json();
        currentUser = profile;
        profileFields.username.value = profile.username || '';
        profileFields.email.value = profile.email || '';
        profileFields.gender.value = profile.gender || 'Other';
        profileFields.age.value = profile.age || '';
        profileFields.avatarSeed.value = profile.avatarSeed || profile.phone || profile.username || '';
        profilePreview.src = avatarUrl(profileFields.avatarSeed.value);
    }

    function openProfileModal() {
        profileModal.classList.remove('hidden');
        loadProfile().catch(error => {
            console.error(error);
            alert('Could not load profile.');
        });
    }

    function closeProfileModal() {
        profileModal.classList.add('hidden');
    }

    openProfile.addEventListener('click', (event) => {
        event.preventDefault();
        openProfileModal();
    });

    closeProfile.addEventListener('click', closeProfileModal);

    profileModal.addEventListener('click', (event) => {
        if (event.target === profileModal) {
            closeProfileModal();
        }
    });

    profileFields.avatarSeed.addEventListener('input', () => {
        profilePreview.src = avatarUrl(profileFields.avatarSeed.value);
    });

    regenerateAvatar.addEventListener('click', () => {
        profileFields.avatarSeed.value = `animal-${Date.now()}`;
        profilePreview.src = avatarUrl(profileFields.avatarSeed.value);
    });

    profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const payload = {
            username: profileFields.username.value.trim(),
            email: profileFields.email.value.trim(),
            gender: profileFields.gender.value,
            age: Number(profileFields.age.value),
            avatarSeed: profileFields.avatarSeed.value.trim()
        };

        try {
            const response = await fetch('/profile', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const updatedProfile = await response.json();
            currentUser = updatedProfile;
            myName.innerText = updatedProfile.username;
            profileImage.src = avatarUrl(updatedProfile.avatarSeed || updatedProfile.phone);
            alert('Profile updated.');
        } catch (error) {
            alert('Profile update failed: ' + error.message);
        }
    });

    passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;

        try {
            const response = await fetch('/profile/password', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            passwordForm.reset();
            alert('Password updated.');
        } catch (error) {
            alert('Password update failed: ' + error.message);
        }
    });

    addcontact.addEventListener('click', () => {
        window.location.href = '/addcontact';
    });

    searchInput.addEventListener('input', () => {
        renderContacts(contactsCache, searchInput.value);
    });

    messageTypeInput.addEventListener('change', () => {
        if (messageTypeInput.value === 'text') {
            input.placeholder = 'Write a message';
        } else if (messageTypeInput.value === 'image') {
            input.placeholder = 'Paste an image URL';
        } else {
            input.placeholder = 'Paste a file URL';
        }
    });

    input.addEventListener('input', () => {
        if (!activeContact) {
            return;
        }

        socket.emit('typing', { toPhoneNumber: activeContact.phone });
        window.clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => {
            socket.emit('stop typing', { toPhoneNumber: activeContact.phone });
        }, 900);
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
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                alert('Your account has been deleted successfully.');
                window.location.href = '/';
            } else {
                alert('Failed to delete account: ' + await response.text());
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactPhoneNumber: activeContact.phone }),
            });

            if (response.ok) {
                messagesContainer.innerHTML = '';
                await fetchSummaries();
                alert('Chat cleared successfully!');
            } else {
                alert('Failed to clear chat: ' + await response.text());
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactPhoneNumber: activeContact.phone }),
            });

            if (response.ok) {
                contactsCache = contactsCache.filter(contact => contact.phone !== activeContact.phone);
                delete summaries[activeContact.phone];
                renderContacts(contactsCache, searchInput.value);
                messagesContainer.innerHTML = '';
                document.getElementById('Window_User').innerText = 'Select a contact';
                document.getElementById('numb').innerText = 'No active chat';
                activeChatAvatar.src = avatarUrl('webchat-default');
                activeContact = null;
                emptyState.style.display = 'flex';
                alert('Contact deleted successfully!');
            } else {
                alert('Failed to delete contact: ' + await response.text());
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

        const value = input.value.trim();
        if (!value) {
            return;
        }

        const type = messageTypeInput.value;
        socket.emit('private message', {
            toPhoneNumber: activeContact.phone,
            message: type === 'text' ? value : '',
            type,
            mediaUrl: type === 'text' ? '' : value,
            fileName: type === 'file' ? value.split('/').pop() : ''
        });

        socket.emit('stop typing', { toPhoneNumber: activeContact.phone });
        input.value = '';
    });

    socket.on('chat message', async (msg) => {
        const contactPhone = msg.fromPhone === currentUserPhone ? msg.toPhoneNumber : msg.fromPhone;

        if (!activeContact || activeContact.phone !== contactPhone) {
            await fetchSummaries();
            return;
        }

        appendMessage({
            message: msg.message,
            type: msg.type,
            mediaUrl: msg.mediaUrl,
            fileName: msg.fileName,
            status: msg.status,
            className: msg.fromPhone === currentUserPhone ? 'message-sent' : 'message-received',
            timestamp: msg.createdAt
        });
        await fetchSummaries();
    });

    socket.on('messages seen', ({ byPhone }) => {
        if (activeContact && activeContact.phone === byPhone) {
            document.querySelectorAll('.message-sent .message-status').forEach(status => {
                status.textContent = 'seen';
            });
        }
    });

    socket.on('typing', ({ fromPhone }) => {
        if (activeContact && activeContact.phone === fromPhone) {
            document.getElementById('numb').innerText = `${fromPhone} - typing...`;
        }
    });

    socket.on('stop typing', ({ fromPhone }) => {
        if (activeContact && activeContact.phone === fromPhone) {
            document.getElementById('numb').innerText = `${fromPhone} - ${onlineStatus[fromPhone] || 'offline'}`;
        }
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
            document.getElementById('numb').innerText = `${phone} - ${status}`;
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
                headers: { 'Content-Type': 'application/json' }
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
            fetchSummaries();
        } catch (error) {
            console.error('Error fetching contacts:', error);
            alert('Error fetching contacts. Please try again.');
        }
    }

    async function fetchSummaries() {
        try {
            const response = await fetch('/chatSummaries', { credentials: 'include' });
            if (!response.ok) {
                return;
            }

            const data = await response.json();
            summaries = data.reduce((map, item) => {
                map[item.phone] = item;
                return map;
            }, {});
            renderContacts(contactsCache, searchInput.value);
        } catch (error) {
            console.error('Error fetching chat summaries:', error);
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
            const response = await fetch(`/onlineStatus?${query}`, { credentials: 'include' });
            if (!response.ok) {
                return;
            }

            Object.assign(onlineStatus, await response.json());
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
            contactsList.appendChild(createChatTile(contact));
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
        avatar.src = avatarUrl(contact.avatarSeed || contact.phone || contact.username);

        const details = document.createElement('div');
        details.classList.add('chat-tile-details');

        const title = document.createElement('div');
        title.classList.add('chat-tile-title');

        const name = document.createElement('span');
        name.textContent = contact.username;

        const rightMeta = document.createElement('span');
        const unreadCount = summaries[contact.phone]?.unreadCount || 0;
        rightMeta.textContent = unreadCount ? String(unreadCount) : 'Chat';
        if (unreadCount) {
            rightMeta.classList.add('unread-badge');
        }

        const subtitle = document.createElement('div');
        subtitle.classList.add('chat-tile-subtitle');

        const statusDot = document.createElement('span');
        statusDot.classList.add('status-dot');
        statusDot.dataset.statusDot = contact.phone;

        const currentStatus = onlineStatus[contact.phone] || 'offline';
        statusDot.classList.toggle('online', currentStatus === 'online');

        const summaryText = document.createElement('span');
        summaryText.dataset.statusText = contact.phone;
        summaryText.textContent = `${currentStatus} - ${previewText(summaries[contact.phone])}`;

        title.appendChild(name);
        title.appendChild(rightMeta);
        subtitle.appendChild(statusDot);
        subtitle.appendChild(summaryText);
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
        numb.innerText = `${contact.phone} - ${onlineStatus[contact.phone] || 'offline'}`;
        activeChatAvatar.src = avatarUrl(contact.avatarSeed || contact.phone || contact.username);

        renderContacts(contactsCache, searchInput.value);

        if (!currentUserPhone) {
            await setCurrentUser();
        }

        await fetchMessages(currentUserPhone, contact.phone);
        await fetchSummaries();
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

            renderMessages(await response.json(), fromPhone);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    function renderMessages(messages, userPhone) {
        messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            appendMessage({
                message: msg.message,
                type: msg.type,
                mediaUrl: msg.mediaUrl,
                fileName: msg.fileName,
                status: msg.status,
                className: msg.sender === userPhone ? 'message-sent' : 'message-received',
                timestamp: msg.createdAt || msg.timestamp
            });
        });

        scrollToBottom();
    }

    function queueScrollToBottom() {
        scrollToBottom();
        requestAnimationFrame(scrollToBottom);
        window.setTimeout(scrollToBottom, 120);
    }

    function appendMessage({ message, type = 'text', mediaUrl = '', fileName = '', status = '', className, timestamp }) {
        const newMessage = document.createElement('div');
        newMessage.classList.add('message', className);

        if (type === 'image' && mediaUrl) {
            const media = document.createElement('a');
            media.classList.add('message-media');
            media.href = mediaUrl;
            media.target = '_blank';
            media.rel = 'noreferrer';

            const image = document.createElement('img');
            image.src = mediaUrl;
            image.alt = message || 'Shared image';
            image.addEventListener('load', queueScrollToBottom);
            media.appendChild(image);
            newMessage.appendChild(media);
        } else if (type === 'file' && mediaUrl) {
            const media = document.createElement('div');
            media.classList.add('message-media');
            const link = document.createElement('a');
            link.href = mediaUrl;
            link.target = '_blank';
            link.rel = 'noreferrer';
            link.textContent = fileName || 'Open file';
            media.appendChild(link);
            newMessage.appendChild(media);
        }

        if (message) {
            const text = document.createElement('div');
            text.classList.add('message-text');
            text.innerText = message;
            newMessage.appendChild(text);
        }

        const meta = document.createElement('div');
        meta.classList.add('message-meta');
        meta.innerText = [formatTime(timestamp), className === 'message-sent' ? status : '']
            .filter(Boolean)
            .join(' - ');

        if (className === 'message-sent') {
            const statusSpan = document.createElement('span');
            statusSpan.classList.add('message-status');
            statusSpan.textContent = status || '';
            meta.innerText = formatTime(timestamp) ? `${formatTime(timestamp)} - ` : '';
            meta.appendChild(statusSpan);
        }

        if (meta.innerText || meta.childNodes.length) {
            newMessage.appendChild(meta);
        }

        messagesContainer.appendChild(newMessage);
        queueScrollToBottom();
    }

    function scrollToBottom() {
        const target = chatScroller || messagesContainer;
        target.scrollTop = target.scrollHeight;
    }

    async function initialize() {
        profileImage.src = avatarUrl('webchat-user');
        await setCurrentUser();
        await fetchContacts();
    }

    initialize();
});
