CREATE TABLE IF NOT EXISTS Users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    image_url VARCHAR(255),
    following UUID[] NOT NULL DEFAULT '{}',
    followers UUID[] NOT NULL DEFAULT '{}',
    description TEXT,
    created TIMESTAMP DEFAULT NOW(),
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Chats (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ChatMembers (
    chat_member_id SERIAL PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES Chats(chat_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS Posts (
    post_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    image_url VARCHAR(255),
    text TEXT NOT NULL,
    likes UUID[],
    created TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES Chats(chat_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES Users(user_id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);
