CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash CHAR(60)     NOT NULL,
  is_admin      BOOLEAN      DEFAULT FALSE,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  artist       VARCHAR(255) NOT NULL DEFAULT 'Unknown Artist',
  album        VARCHAR(255),
  album_artist VARCHAR(255),
  genre        VARCHAR(100),
  year         SMALLINT,
  track_no     SMALLINT,
  duration_sec INT,
  bitrate_kbps INT,
  codec        VARCHAR(20),
  file_size    BIGINT,
  sha256       CHAR(64) UNIQUE,
  audio_key    VARCHAR(255) NOT NULL,
  cover_key    VARCHAR(255),
  uploaded_by  INT,
  uploaded_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_artist (artist),
  INDEX idx_album (album),
  INDEX idx_genre (genre),
  FULLTEXT KEY ft_search (title, artist, album)
);

CREATE TABLE IF NOT EXISTS playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  name       VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id INT,
  song_id     INT,
  position    INT DEFAULT 0,
  added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (playlist_id, song_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id)     REFERENCES songs(id)     ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS play_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL,
  song_id   INT NOT NULL,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  INDEX idx_played_at (played_at),
  INDEX idx_song (song_id)
);
