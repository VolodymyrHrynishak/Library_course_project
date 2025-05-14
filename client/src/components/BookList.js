import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function BookList() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/books");
        console.log("Отримані книги:", response.data);

        if (response.data && response.data.books) {
          setBooks(response.data.books);
          // Вилучаємо унікальні категорії з книг
          const uniqueCategories = [
            ...new Set(response.data.books.map((book) => book.category)),
          ];
          setCategories(uniqueCategories.filter(Boolean));
        } else {
          setBooks([]);
          setError("Невірний формат даних");
        }
      } catch (error) {
        console.error("Помилка:", error);
        setError("Не вдалося завантажити книги");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    setIsAdmin(userRole === "admin");
  }, []);

  const handleImageError = (e) => {
    e.target.src = "/no-cover.jpg";
    e.target.onerror = null;
    e.target.style.objectFit = "contain";
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteBook = async (id) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цю книгу?")) return;
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Будь ласка, увійдіть в систему");
        return;
      }
  
      const response = await axios.delete(`http://localhost:5000/api/books/${id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (response.data.success) {
        setBooks((prev) => prev.filter((book) => book.id !== id));
        alert("Книгу успішно видалено");
      } else {
        alert("Не вдалося видалити книгу");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Помилка видалення: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Завантаження...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container alert alert-danger my-5">
        {error}
        <Link to="/" className="btn btn-secondary ms-3">
          Спробувати знову
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* Search and Filter Panel */}
      <div className="bg-white p-4 rounded-4 shadow-sm mb-5">
        <div className="row g-3">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Пошук за назвою або автором..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ height: '48px' }}
              />
            </div>
          </div>
          <div className="col-md-4">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ height: '48px' }}
            >
              <option value="">Всі категорії</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <button
              className="btn btn-outline-secondary w-100 h-100 rounded-3"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("");
              }}
              style={{ height: '48px' }}
            >
              <i className="bi bi-x-lg me-2"></i>
              Скинути
            </button>
          </div>
        </div>
      </div>

      <h2 className="mb-4 fw-bold">Книги</h2>

      {filteredBooks.length === 0 ? (
        <div className="alert alert-warning rounded-4 shadow-sm">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Книги не знайдено
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {filteredBooks.map((book) => (
            <div className="col" key={book.id}>
              <div className="card h-100 border-0 shadow-sm rounded-4" 
                   style={{ transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                   onMouseOver={(e) => {
                     e.currentTarget.style.transform = 'translateY(-5px)';
                     e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                   }}
                   onMouseOut={(e) => {
                     e.currentTarget.style.transform = 'translateY(0)';
                     e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                   }}>
                <div style={{ height: "300px", overflow: "hidden", borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', backgroundColor: 'var(--card-bg)' }}>
                  <img
                    src={`http://localhost:5000${book.cover_url || ""}`}
                    className="card-img-top h-100 w-100"
                    alt={`Обкладинка "${book.title}"`}
                    style={{
                      objectFit: book.cover_url ? "cover" : "contain",
                      backgroundColor: 'transparent',
                    }}
                    onError={handleImageError}
                  />
                </div>
                <div className="card-body d-flex flex-column p-4">
                  <h5 className="card-title fw-bold mb-2">{book.title}</h5>
                  <p className="card-text text-muted mb-3">{book.author}</p>
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      {book.category && (
                        <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2">
                          {book.category}
                        </span>
                      )}
                      <span className="text-muted small">
                        {book.year || "Рік не вказано"}
                      </span>
                    </div>
                    <div className="d-grid">
                      <Link 
                        to={`/book/${book.id}`} 
                        className="btn btn-primary rounded-3 py-2"
                        style={{ transition: 'all 0.3s ease' }}
                      >
                        Детальніше
                      </Link>
                      {isAdmin && (
                        <button
                          className="btn btn-danger rounded-3 py-2 mt-2"
                          onClick={() => handleDeleteBook(book.id)}
                        >
                          Видалити
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BookList;
