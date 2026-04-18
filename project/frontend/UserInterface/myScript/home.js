document.addEventListener('DOMContentLoaded', () => {
    const contactsList = document.getElementById('chats-list');
    const addcontact = document.getElementById('new-contact');
    const myName = document.getElementById('myname');
    const deleteAccount = document.getElementById('deleteAccount');

    async function setChatPersonUsername() {
        try {
            const response = await fetch('/currentUser', {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch current user phone');

            const data = await response.json();
            myName.innerText = data.username;  // Set the username
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }

    setChatPersonUsername(); // Call the function to set the chatPerson's username



    // Event listner to add new contact
    addcontact.addEventListener('click', () => {
        window.location.href = '/addcontact'; // Navigates to /addcontact endpoint when clicked
    });

    //Event listner to delete Account
    deleteAccount.addEventListener('click', async () => {
        const confirmation = confirm('Are you sure you want to delete your account permanently? This action cannot be undone.');
        
        if (confirmation) {
            try {
                const response = await fetch('/deleteAccount', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
    
                if (response.ok) {
                    alert('Your account has been deleted successfully.');
                    // Optionally, redirect the user to a goodbye page or the home page
                    window.location.href = '/';
                } else {
                    const errorMessage = await response.text();
                    alert('Failed to delete account: ' + errorMessage);
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('An error occurred while deleting your account. Please try again.');
            }
        }
    });    

    // Function to fetch contacts from the server
    async function fetchContacts() {
        try {
            const response = await fetch('/Usrcontacts', {
                method: 'GET',
                credentials: 'include', // Include cookies in the request
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Unauthorized! Please log in again.');
                    window.location.href = '/login.html'; // Redirect to login page
                } else {
                    throw new Error('Failed to fetch contacts.');
                }
            }

            const contacts = await response.json();
            renderContacts(contacts);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            alert('Error fetching contacts. Please try again.');
        }
    }

    // Function to render contacts in the DOM
    function renderContacts(contacts) {
        contactsList.innerHTML = ''; // Clear existing contacts

        if (contacts.length === 0) {
            contactsList.innerHTML = '<li class="no-contacts">No contacts found.</li>';
            return;
        }

        contacts.forEach(contact => {
            const chatTile = createChatTile(contact);
            contactsList.appendChild(chatTile);
        });
    }

    // Function to create a chat tile element
    function createChatTile(contact) {
        const chatTile = document.createElement('div');
        chatTile.classList.add('chat-tile');
        chatTile.setAttribute('data-phone', contact.phone); // Add the phone as a data attribute


        const avatar = document.createElement('img');
        avatar.classList.add('chat-tile-avatar');
        avatar.src = "https://picsum.photos/id/103/50"; // Set proper avatar path

        const details = document.createElement('div');
        details.classList.add('chat-tile-details');

        const title = document.createElement('div');
        title.classList.add('chat-tile-title');

        const name = document.createElement('span');
        name.textContent = contact.username;

        const subtitle = document.createElement('div');
        subtitle.classList.add('chat-tile-subtitle');

        title.appendChild(name);

        details.appendChild(title);
        details.appendChild(subtitle);

        chatTile.appendChild(avatar);
        chatTile.appendChild(details);

        // Add click event to open the chat
        chatTile.addEventListener('click', () => handleChatClick(contact));

        return chatTile;
    }

    // Handle chat tile click
    async function handleChatClick(contact) {
        const chatPerson = document.getElementById('Window_User');
        const numb = document.getElementById('numb');
        const DEFimage = document.getElementById('default-image');
        DEFimage.style.display = 'none';

        chatPerson.innerText = contact.username;
        numb.innerText = contact.phone;
        const socket = io(); // Initialize Socket.IO connection

        const form = document.getElementById('message-form');
        const input = document.getElementById('message-input');
        const messagesContainer = document.getElementById('chat-messages');
        const clearChat = document.getElementById('clear-chat');

        // Event listener for the clear chat icon
        clearChat.addEventListener('click', async () => {
            const confirmation = confirm('Are you sure you want to clear all chats?'); // Ask for confirmation
            if (confirmation) {
                try {
                    // Make a request to the server to clear the chat
                    const response = await fetch('/clearChat', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ contactPhoneNumber: contact.phone }), // Send the contact phone number
                    });

                    if (response.ok) {
                        // If the response is OK, clear the chat messages from the UI
                        document.getElementById('chat-messages').innerHTML = '';
                        alert('Chat cleared successfully!');
                    } else {
                        const errorMessage = await response.text();
                        alert('Failed to clear chat: ' + errorMessage);
                    }
                } catch (error) {
                    console.error('Error clearing chat:', error);
                    alert('Error clearing chat. Please try again later.');
                }
            }
        });


        // Event listener for delete contact
        const deleteContact = document.getElementById('delete-contact');  // Make sure to get the correct element for your "Delete Contact" option

        deleteContact.addEventListener('click', async () => {
            const confirmation = confirm('Are you sure you want to delete this contact?');
            if (confirmation) {
                try {
                    const response = await fetch('/deleteContact', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ contactPhoneNumber: contact.phone }),  // Send the phone number of the contact to be deleted
                    });

                    if (response.ok) {
                        // Remove the contact from the UI
                        document.querySelector(`[data-phone="${contact.phone}"]`).remove();  // Assuming each contact has a data attribute with the phone number
                        alert('Contact deleted successfully!');
                    } else {
                        const errorMessage = await response.text();
                        alert('Failed to delete contact: ' + errorMessage);
                    }
                } catch (error) {
                    console.error('Error deleting contact:', error);
                    alert('Error deleting contact. Please try again later.');
                }
            }
        });

        const { phone } = contact; // Get the phone number from the contact

        let currentUserPhone = await getCurrentUserPhone(); // Get the current user's phone number

        // Function to auto-scroll to the bottom when a new message is added
        function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Fetch initial messages when chat is opened
        await fetchMessages(currentUserPhone, phone);

        // Send a new message when the form is submitted
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent form refresh
            if (input.value) {
                socket.emit('private message', { toPhoneNumber: phone, message: input.value });
                input.value = ''; // Clear the input field
            }
        });

        // Listen for incoming messages
        socket.on('chat message', (msg) => {
            const newMessage = document.createElement('div');
            newMessage.classList.add('message');
            newMessage.classList.add(msg.from === socket.id ? 'message-sent' : 'message-received');
            newMessage.innerText = msg.message;
            messagesContainer.appendChild(newMessage);
            scrollToBottom();
        });
    }

    // Function to fetch messages
    async function fetchMessages(currentUserPhone, phone) {
        try {
            const response = await fetch(`/messages/${encodeURIComponent(currentUserPhone)}/${encodeURIComponent(phone)}`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch messages');

            const messages = await response.json();
            renderMessages(messages, currentUserPhone);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    // Function to render messages in the DOM
    function renderMessages(messages, currentUserPhone) {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = ''; // Clear existing messages

        messages.forEach(msg => {
            const newMessage = document.createElement('div');
            newMessage.classList.add('message');
            newMessage.classList.add(msg.sender === currentUserPhone ? 'message-sent' : 'message-received');
            newMessage.innerText = msg.message;
            messagesContainer.appendChild(newMessage);
        });

        scrollToBottom(); // Scroll to the bottom after rendering messages
    }

    // Function to get the current user's phone number
    async function getCurrentUserPhone() {
        try {
            const response = await fetch('/currentUser', {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch current user phone');

            const data = await response.json();
            return data.phone; // Return the current user's phone number
        } catch (error) {
            console.error('Error fetching current user phone:', error);
        }
    }

    // Auto-scroll to the bottom of the chat window
    function scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Initial fetch of contacts
    fetchContacts();
});
