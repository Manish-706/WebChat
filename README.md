A dynamic real-time chat application that facilitates instant messaging and contact management, ensuring secure user 
authentication and maintaining chat history. 

  <<<<<<<<<<< Tech Stack and Features >>>>>>>>>>><br>
  -> JavaScript, Express.js, Socket.IO, MongoDB, HTML, CSS<br> 
• Real-Time Messaging: Utilizes Socket.IO for effortless two-way communication between users.<br> 
• User Authentication: Implements JWT tokens and cookies to ensure secure login sessions and protect user identity.<br> 
• Data Management: Employs MongoDB and Mongoose for efficient storage of user contacts, messages, and chat 
histories.<br> 
• Backend Framework: Leverages Express.js for API development and dynamic retrieval of chat histories.<br> 
• Frontend Interface: Crafted with HTML and CSS for an engaging, responsive user experience.<br> 


<<<<<<<< WebChat Project Usage Guide >>>>>>>>>><br>


# WebChat Project Usage Guide

## Prerequisites
1. Node.js (v14 or later) installed on your system.
2. MongoDB Atlas account for database hosting.

## Steps to Use the Project

### 1. Clone the Repository
   Open your terminal and run the following command to clone the repository:
   ```bash
   git clone https://github.com/Manish-706/WebChat.git
   ```

### 2. Navigate to the Project Directory
   Change into the project directory:
   ```bash
   cd WebChat
   ```

### 3. Install Dependencies
   Navigate to the backend folder and install the required dependencies:
   ```bash
   cd backend
   npm install
   ```

### 4. Set Up Environment Variables
   Create a `.env` file in the `backend/src` directory and add the following variables:
   ```plaintext
   SECRETE_KEY=your_secret_key
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.9ia9u.mongodb.net/ChatApp?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with your MongoDB Atlas credentials.

### 5. Start the Server
   In the `backend` directory, run the following command to start the server:
   ```bash
   npm start
   ```

### 6. Access the Application
   Open your browser and navigate to `http://localhost:3000` to access the WebChat application.






## Setting up the Environment Variables

1. Duplicate the `.env.example` file and rename it to `.env`.
2. Fill in the required environment variables in the `.env` file, such as database credentials, API keys, etc.

Example:

```bash
cp .env.example .env
```

 ###   ---->>>>      [Live Project Link](https://webchat-jicc.onrender.com/)
