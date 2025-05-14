require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// Налаштування CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

const JWT_SECRET = process.env.JWT_SECRET || "your_strong_secret_here";
const PORT = process.env.PORT || 5000;

// Підключення до БД з обробкою помилок
const db = new sqlite3.Database(
  "./db/library.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error("Помилка підключення до БД:", err.message);
      process.exit(1);
    }
    console.log("Підключено до SQLite БД");
    db.run("PRAGMA foreign_keys = ON;"); // Включаємо зовнішні ключі
  }
);

// Створення таблиць з обробкою помилок
const createTables = () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      description TEXT,
      category TEXT,
      cover_url TEXT,
      book_file_url TEXT,
      year INTEGER,
      rating REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      UNIQUE(user_id, book_id)
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )`,
    `CREATE TRIGGER IF NOT EXISTS update_book_timestamp
     AFTER UPDATE ON books
     FOR EACH ROW
     BEGIN
       UPDATE books SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
     END;`,
  ];

  queries.forEach((query) => {
    db.run(query, (err) => {
      if (err) console.error("Помилка створення таблиці:", err.message);
    });
  });
};

createTables();

// Middleware для перевірки JWT токена
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error("JWT Verification Error:", err); // Додайте логування
        return res.status(403).json({ error: "Недійсний токен" });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: "Токен відсутній" });
  }
};

// Middleware для перевірки адміна
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Доступ заборонено" });
  }
  next();
};

// Налаштування Multer для завантаження файлів
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "public", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "cover") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Тільки зображення дозволені для обкладинки"), false);
    }
  } else if (file.fieldname === "bookFile") {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Тільки PDF-файли дозволені"), false);
    }
  } else {
    cb(new Error("Невідомий тип файлу"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
}).fields([
  { name: "cover", maxCount: 1 },
  { name: "bookFile", maxCount: 1 },
]);

// Реєстрація користувача
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Усі поля обов'язкові" });
  }

  try {
    const userExists = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        [username, email],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    if (userExists) {
      return res.status(400).json({ error: "Користувач вже існує" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    db.run(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Помилка сервера" });
        }
        res.status(201).json({
          success: true,
          id: this.lastID,
          message: "Користувач успішно зареєстрований",
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Логін користувача
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Логін і пароль обов'язкові" });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) return res.status(500).json({ error: "Помилка сервера" });
      if (
        !user ||
        user.is_banned ||
        !(await bcrypt.compare(password, user.password))
      ) {
        return res.status(401).json({ error: "Невірний логін або пароль" });
      }

      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          username: user.username,
        },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        token,
        id: user.id,
        role: user.role,
        username: user.username,
        expiresIn: 3600,
      });
    }
  );
});

// Отримання списку книг з пагінацією
app.get("/api/books", (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    sort = "title",
    order = "ASC",
  } = req.query;
  const offset = (page - 1) * limit;

  let query = "SELECT * FROM books";
  let countQuery = "SELECT COUNT(*) as total FROM books";
  let params = [];

  if (search) {
    const searchParam = `%${search}%`;
    query += " WHERE title LIKE ? OR author LIKE ?";
    countQuery += " WHERE title LIKE ? OR author LIKE ?";
    params.push(searchParam, searchParam);
  }

  // Додаємо сортування
  const validSortFields = ["title", "author", "year", "rating", "created_at"];
  const validOrder = ["ASC", "DESC"];
  const sortField = validSortFields.includes(sort) ? sort : "title";
  const sortOrder = validOrder.includes(order.toUpperCase()) ? order : "ASC";

  query += ` ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.serialize(() => {
    db.get(countQuery, params.slice(0, search ? 2 : 0), (err, countResult) => {
      if (err) {
        console.error("Помилка підрахунку книг:", err);
        return res.status(500).json({ error: "Помилка сервера" });
      }

      db.all(query, params, (err, books) => {
        if (err) {
          console.error("Помилка отримання книг:", err);
          return res.status(500).json({ error: "Помилка сервера" });
        }

        res.json({
          books,
          pagination: {
            total: countResult.total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(countResult.total / limit),
          },
        });
      });
    });
  });
});

// Отримання інформації про конкретну книгу
app.get("/api/books/:id", (req, res) => {
  const bookId = req.params.id;

  db.serialize(() => {
    // Отримуємо інформацію про книгу
    db.get(
      `SELECT b.*, 
       AVG(r.rating) as avg_rating,
       COUNT(r.id) as ratings_count,
       (SELECT rating FROM ratings WHERE user_id = ? AND book_id = b.id) as user_rating
       FROM books b
       LEFT JOIN ratings r ON b.id = r.book_id
       WHERE b.id = ?
       GROUP BY b.id`,
      [req.user?.id || 0, bookId],
      (err, book) => {
        if (err) {
          console.error("Помилка отримання книги:", err);
          return res.status(500).json({ error: "Помилка сервера" });
        }
        if (!book) {
          return res.status(404).json({ error: "Книга не знайдена" });
        }

        // Отримуємо останні 3 коментарі
        db.all(
          `SELECT c.*, u.username 
           FROM comments c
           JOIN users u ON c.user_id = u.id
           WHERE c.book_id = ?
           ORDER BY c.created_at DESC
           LIMIT 3`,
          [bookId],
          (err, recentComments) => {
            if (err) {
              console.error("Помилка отримання коментарів:", err);
              return res.status(500).json({ error: "Помилка сервера" });
            }

            res.json({
              ...book,
              recentComments,
            });
          }
        );
      }
    );
  });
});

// Додавання нової книги
app.post("/api/books", authenticateJWT, adminMiddleware, (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          error:
            err.code === "LIMIT_FILE_SIZE"
              ? "Файл занадто великий (максимум 20MB)"
              : "Помилка завантаження файлу",
        });
      }
      return res.status(400).json({ error: err.message });
    }

    const { title, author, description, year, category } = req.body;

    if (!title || !author) {
      // Видаляємо завантажені файли при помилці валідації
      if (req.files?.cover) fs.unlinkSync(req.files.cover[0].path);
      if (req.files?.bookFile) fs.unlinkSync(req.files.bookFile[0].path);
      return res.status(400).json({ error: "Назва та автор обов'язкові" });
    }

    const coverPath = req.files?.cover
      ? "/uploads/" + req.files.cover[0].filename
      : null;
    const bookFilePath = req.files?.bookFile
      ? "/uploads/" + req.files.bookFile[0].filename
      : null;

    db.run(
      "INSERT INTO books (title, author, description, year, category, cover_url, book_file_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, author, description, year, category, coverPath, bookFilePath],
      function (err) {
        if (err) {
          console.error("Помилка додавання книги:", err);
          // Видаляємо файли при помилці в БД
          if (coverPath)
            fs.unlinkSync(path.join(__dirname, "public", coverPath));
          if (bookFilePath)
            fs.unlinkSync(path.join(__dirname, "public", bookFilePath));
          return res.status(500).json({ error: "Помилка сервера" });
        }

        db.get(
          "SELECT * FROM books WHERE id = ?",
          [this.lastID],
          (err, newBook) => {
            if (err || !newBook) {
              return res.status(201).json({
                id: this.lastID,
                title,
                author,
                cover_url: coverPath,
                book_file_url: bookFilePath,
              });
            }
            res.status(201).json(newBook);
          }
        );
      }
    );
  });
});

app.post("/api/books/:id/rate", authenticateJWT, (req, res) => {
  const { rating } = req.body;
  const { id: bookId } = req.params;
  const userId = req.user.id;

  // Додаткова валідація
  if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ error: "Рейтинг має бути числом від 1 до 5" });
  }

  if (!bookId || isNaN(bookId)) {
    return res.status(400).json({ error: "Невірний ID книги" });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // 1. Перевіряємо існування книги
    db.get("SELECT id FROM books WHERE id = ?", [bookId], (err, book) => {
      if (err) {
        db.run("ROLLBACK");
        console.error("Помилка перевірки книги:", err);
        return res.status(500).json({ error: "Помилка сервера" });
      }

      if (!book) {
        db.run("ROLLBACK");
        return res.status(404).json({ error: "Книга не знайдена" });
      }

      // 2. Додаємо/оновлюємо рейтинг
      db.run(
        `INSERT INTO ratings (user_id, book_id, rating) 
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, book_id) DO UPDATE SET rating = excluded.rating`,
        [userId, bookId, rating],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            console.error("Помилка додавання рейтингу:", err);
            return res.status(500).json({ error: "Помилка сервера" });
          }

          // 3. Перераховуємо середній рейтинг
          db.get(
            `SELECT AVG(rating) as avgRating, COUNT(*) as ratingsCount
             FROM ratings 
             WHERE book_id = ?`,
            [bookId],
            (err, result) => {
              if (err) {
                db.run("ROLLBACK");
                console.error("Помилка розрахунку рейтингу:", err);
                return res.status(500).json({ error: "Помилка сервера" });
              }

              // 4. Оновлюємо книгу
              db.run(
                "UPDATE books SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [result.avgRating, bookId],
                (err) => {
                  if (err) {
                    db.run("ROLLBACK");
                    console.error("Помилка оновлення книги:", err);
                    return res.status(500).json({ error: "Помилка сервера" });
                  }

                  db.run("COMMIT");
                  res.json({
                    success: true,
                    averageRating: result.avgRating,
                    ratingsCount: result.ratingsCount,
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});
// Видалення книги
app.delete("/api/books/:id", authenticateJWT, adminMiddleware, (req, res) => {
  const bookId = req.params.id;
  
  // Додамо логування для дебагінгу
  console.log(`Спроба видалити книгу ID: ${bookId}`);
  console.log(`Користувач, який видаляє: ${JSON.stringify(req.user)}`);

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // 1. Отримуємо інформацію про книгу
    db.get(
      "SELECT cover_url, book_file_url FROM books WHERE id = ?",
      [bookId],
      (err, book) => {
        if (err) {
          db.run("ROLLBACK");
          console.error("Помилка пошуку книги:", err);
          return res.status(500).json({ error: "Помилка сервера при пошуку книги" });
        }

        if (!book) {
          db.run("ROLLBACK");
          return res.status(404).json({ error: "Книга не знайдена" });
        }

        console.log("Знайдена книга для видалення:", book);

        // 2. Видаляємо книгу з БД
        db.run(
          "DELETE FROM books WHERE id = ?",
          [bookId],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              console.error("Помилка видалення книги:", err);
              return res.status(500).json({ error: "Помилка сервера при видаленні книги" });
            }

            console.log(`Книга ${bookId} видалена з БД. Спроба видалити файли...`);

            // 3. Видаляємо файли (якщо вони існують)
            const deleteFile = (filePath, fileType) => {
              return new Promise((resolve) => {
                const fullPath = path.join(__dirname, "public", filePath);
                
                fs.access(fullPath, fs.constants.F_OK, (err) => {
                  if (err) {
                    console.log(`${fileType} не знайдено: ${fullPath}`);
                    return resolve();
                  }

                  fs.unlink(fullPath, (err) => {
                    if (err) {
                      console.error(`Помилка видалення ${fileType}:`, err);
                    } else {
                      console.log(`${fileType} успішно видалено: ${fullPath}`);
                    }
                    resolve();
                  });
                });
              });
            };

            // Видаляємо файли паралельно
            Promise.all([
              book.cover_url ? deleteFile(book.cover_url, "Обкладинка") : Promise.resolve(),
              book.book_file_url ? deleteFile(book.book_file_url, "Файл книги") : Promise.resolve()
            ])
            .then(() => {
              db.run("COMMIT");
              console.log(`Книга ${bookId} успішно видалена`);
              res.json({ success: true, message: "Книга успішно видалена" });
            })
            .catch((err) => {
              db.run("ROLLBACK");
              console.error("Помилка при видаленні файлів:", err);
              res.status(500).json({ error: "Книгу видалено, але виникли проблеми з видаленням файлів" });
            });
          }
        );
      }
    );
  });
});
// Створення адміна при першому запуску
const createAdmin = () => {
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (err) return console.error("Помилка перевірки адміна:", err);

    if (!row) {
      bcrypt.hash("admin123", 12, (err, hash) => {
        if (err) return console.error("Помилка хешування пароля:", err);

        db.run(
          "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
          ["admin", "admin@example.com", hash, "admin"],
          (err) => {
            if (err) console.error("Помилка створення адміна:", err);
            else console.log("Адміністратор створений: admin/admin123");
          }
        );
      });
    }
  });
};
// Додавання коментаря до книги
app.post("/api/books/:id/comments", authenticateJWT, (req, res) => {
  const { text, rating } = req.body;
  const bookId = req.params.id;
  const userId = req.user.id;

  if (!text || text.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Коментар має містити принаймні 3 символи" });
  }

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ error: "Рейтинг має бути від 1 до 5" });
  }

  db.run(
    `INSERT INTO comments (user_id, book_id, text, rating, created_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, bookId, text.trim(), rating || null],
    function (err) {
      if (err) {
        console.error("Помилка додавання коментаря:", err);
        return res.status(500).json({ error: "Помилка сервера" });
      }

      res.status(201).json({
        id: this.lastID,
        text,
        rating,
        userId,
        bookId,
        createdAt: new Date().toISOString(),
      });
    }
  );
});

// Отримання коментарів для книги
app.get("/api/books/:id/comments", (req, res) => {
  const bookId = req.params.id;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  db.serialize(() => {
    // Отримуємо коментарі з інформацією про користувачів
    db.all(
      `SELECT c.*, u.username 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.book_id = ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [bookId, limit, offset],
      (err, comments) => {
        if (err) {
          console.error("Помилка отримання коментарів:", err);
          return res.status(500).json({ error: "Помилка сервера" });
        }

        // Отримуємо загальну кількість коментарів
        db.get(
          `SELECT COUNT(*) as total FROM comments WHERE book_id = ?`,
          [bookId],
          (err, count) => {
            if (err) {
              console.error("Помилка підрахунку коментарів:", err);
              return res.status(500).json({ error: "Помилка сервера" });
            }

            res.json({
              comments,
              pagination: {
                total: count.total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count.total / limit),
              },
            });
          }
        );
      }
    );
  });
});

// Видалення коментаря (тільки для автора або адміна)
app.delete("/api/comments/:id", authenticateJWT, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const isAdmin = req.user.role === "admin";

  db.get(
    `SELECT user_id FROM comments WHERE id = ?`,
    [commentId],
    (err, comment) => {
      if (err) {
        console.error("Помилка перевірки коментаря:", err);
        return res.status(500).json({ error: "Помилка сервера" });
      }

      if (!comment) {
        return res.status(404).json({ error: "Коментар не знайдено" });
      }

      if (comment.user_id !== userId && !isAdmin) {
        return res.status(403).json({ error: "Недостатньо прав" });
      }

      db.run(`DELETE FROM comments WHERE id = ?`, [commentId], function (err) {
        if (err) {
          console.error("Помилка видалення коментаря:", err);
          return res.status(500).json({ error: "Помилка сервера" });
        }

        res.json({ success: true, message: "Коментар успішно видалено" });
      });
    }
  );
});

// Отримання списку користувачів (тільки для адмінів)
app.get(
  "/api/admin/users",
  authenticateJWT,
  adminMiddleware,
  async (req, res) => {
    try {
      const users = await new Promise((resolve, reject) => {
        db.all(
          "SELECT id, username, email, role, is_banned FROM users",
          [],
          (err, rows) => (err ? reject(err) : resolve(rows))
        );
      });
      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: "Помилка сервера" });
    }
  }
);

// Блокування/розблокування користувача
app.put(
  "/api/admin/users/:id/ban",
  authenticateJWT,
  adminMiddleware,
  async (req, res) => {
    const { id } = req.params;
    const { isBanned } = req.body;

    try {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET is_banned = ? WHERE id = ? AND role != "admin"',
          [isBanned ? 1 : 0, id],
          function (err) {
            if (err) return reject(err);
            if (this.changes === 0) {
              return reject(new Error("Користувача не знайдено або це адмін"));
            }
            resolve();
          }
        );
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Додати таблицю новин
db.run(`
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);

const newsImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "public", "news_images");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const uploadNewsImage = multer({
  storage: newsImageStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Тільки зображення дозволені"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Маршрути для новин
app.get("/api/news", async (req, res) => {
  try {
    const news = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT n.*, u.username 
        FROM news n
        LEFT JOIN users u ON n.user_id = u.id
        ORDER BY n.created_at DESC
      `,
        [],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });
    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

app.post("/api/news", authenticateJWT, adminMiddleware, (req, res) => {
  uploadNewsImage.single("image")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          error:
            err.code === "LIMIT_FILE_SIZE"
              ? "Файл занадто великий (максимум 5MB)"
              : "Помилка завантаження зображення",
        });
      }
      return res.status(400).json({ error: err.message });
    }

    const { title, content } = req.body;

    if (!title || !content) {
      // Видаляємо завантажене зображення при помилці валідації
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Заголовок і зміст обов'язкові" });
    }

    try {
      const imageUrl = req.file ? "/news_images/" + req.file.filename : null;

      const result = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO news (title, content, image_url, user_id) VALUES (?, ?, ?, ?)",
          [title, content, imageUrl, req.user.id],
          function (err) {
            if (err) return reject(err);

            db.get(
              `SELECT n.*, u.username 
               FROM news n
               LEFT JOIN users u ON n.user_id = u.id
               WHERE n.id = ?`,
              [this.lastID],
              (err, row) => (err ? reject(err) : resolve(row))
            );
          }
        );
      });

      res.status(201).json({ newPost: result });
    } catch (err) {
      // Видаляємо завантажене зображення при помилці
      if (req.file) {
        fs.unlinkSync(
          path.join(__dirname, "public", "news_images", req.file.filename)
        );
      }
      console.error("Error adding news:", err);
      res.status(500).json({ error: "Помилка сервера" });
    }
  });
});

app.delete(
  "/api/news/:id",
  authenticateJWT,
  adminMiddleware,
  async (req, res) => {
    try {
      const newsId = req.params.id;

      // 1. Знаходимо новину, щоб отримати шлях до зображення
      const newsItem = await new Promise((resolve, reject) => {
        db.get(
          "SELECT image_url FROM news WHERE id = ?",
          [newsId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!newsItem) {
        return res.status(404).json({ error: "Новину не знайдено" });
      }

      // 2. Видаляємо новину з БД
      await new Promise((resolve, reject) => {
        db.run("DELETE FROM news WHERE id = ?", [newsId], function (err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // 3. Видаляємо пов'язане зображення (якщо воно є)
      if (newsItem.image_url) {
        const imagePath = path.join(__dirname, "public", newsItem.image_url);
        fs.unlink(imagePath, (err) => {
          if (err) console.error("Помилка видалення зображення:", err);
        });
      }

      res.json({ success: true, message: "Новину успішно видалено" });
    } catch (err) {
      console.error("Помилка видалення новини:", err);
      res.status(500).json({ error: "Помилка сервера при видаленні новини" });
    }
  }
);

app.use(
  "/news_images",
  express.static(path.join(__dirname, "public", "news_images"))
);

createAdmin();

// Обробка помилок Multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error:
        err.code === "LIMIT_FILE_SIZE"
          ? "Файл занадто великий (максимум 20MB)"
          : "Помилка завантаження файлу",
    });
  }
  next(err);
});

// Обробка 404
app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не знайдено" });
});

// Обробка інших помилок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Внутрішня помилка сервера" });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`);
  console.log("Режим:", process.env.NODE_ENV || "development");
});
