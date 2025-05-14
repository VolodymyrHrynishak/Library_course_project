import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import NewsPost from "../components/NewsPost";
import AddNewsModal from "../components/AddNewsModal";

function HomePage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/news");
        setNews(response.data.news);
      } catch (err) {
        setError("Не вдалося завантажити новини");
      } finally {
        setLoading(false);
      }
    };

    const checkAdminStatus = () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decoded = jwtDecode(token);
          setIsAdmin(decoded.role === "admin");
          setAdminName(decoded.username || decoded.name || "");
        } catch (err) {
          console.error("Помилка декодування токена:", err);
        }
      }
    };

    fetchNews();
    checkAdminStatus();
  }, []);

  const handleAddNews = async (formData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/news",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setNews([response.data.newPost, ...news]);
      setShowAddModal(false);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Не вдалося додати новину");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteNews = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("userRole");

      if (!token || role !== "admin") {
        throw new Error("Недостатньо прав для видалення");
      }

      await axios.delete(`http://localhost:5000/api/news/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNews((prevNews) => prevNews.filter((post) => post.id !== id));
    } catch (err) {
      console.error("Помилка:", err);
      alert(err.response?.data?.error || "Не вдалося видалити");
    }
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div
          className="spinner-border text-primary"
          role="status"
          style={{ width: "4rem", height: "4rem" }}
        >
          <span className="visually-hidden">Завантаження...</span>
        </div>
        <p className="mt-2">Завантаження новин...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      {/* Modern Hero Section with Gradient */}
      <div className="hero-section py-5" style={{
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container text-center position-relative" style={{ zIndex: 2 }}>
          <h1 className="display-3 fw-bold mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
            Українська Електронна Бібліотека
          </h1>
          <p className="lead mb-5 fs-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
            Сайт зібрав твори різних за жанром і часом українських
            письменників-класиків і сучасних авторів
          </p>

          <div className="d-flex justify-content-center gap-4">
            <button
              className="btn btn-light btn-lg px-4 py-3 rounded-pill shadow-sm"
              onClick={() => navigate("/book-list")}
              style={{ transition: 'all 0.3s ease' }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Читати онлайн
            </button>
            <button
              className="btn btn-outline-light btn-lg px-4 py-3 rounded-pill"
              onClick={() => navigate("/book-list")}
              style={{ transition: 'all 0.3s ease' }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Завантажити книги
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="fw-bold mb-0">Останні новини</h2>
              {isAdmin && (
                <button
                  className="btn btn-primary rounded-pill px-4"
                  onClick={() => setShowAddModal(true)}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  ➕ Додати новину
                </button>
              )}
            </div>

            {isAdmin && adminName && (
              <p className="text-muted mb-4">
                Ви увійшли як <strong>{adminName}</strong>
              </p>
            )}

            {error && (
              <div className="alert alert-danger rounded-3 shadow-sm">
                {error}
              </div>
            )}

            {news.length > 0 ? (
              news.map((post) => (
                <NewsPost
                  key={post.id}
                  post={post}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteNews}
                />
              ))
            ) : (
              <div className="alert alert-info rounded-3 shadow-sm">
                Новини відсутні
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            {/* Top Books Card */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <h5 className="card-title fw-bold mb-4">
                  Онлайн-бібліотека рекомендує:
                </h5>
                <ul className="list-group list-group-flush">
                  {[
                    "Тіні забутих предків",
                    "Майстер і Маргарита",
                    "Камінний хрест"
                  ].map((book, index) => (
                    <li key={index} className="list-group-item border-0 px-0 py-2">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-primary rounded-pill me-3">{index + 1}</span>
                        <span>{book}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Useful Information Card */}
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h5 className="card-title fw-bold mb-4">Корисна інформація</h5>
                <div className="mb-4">
                  <h6 className="fw-semibold mb-2">
                    <i className="bi bi-clock me-2"></i>
                    Графік роботи:
                  </h6>
                  <p className="mb-0">
                    Пн-Пт: 9:00-20:00
                    <br />
                    Сб-Нд: 10:00-18:00
                  </p>
                </div>
                <div className="mb-4">
                  <h6 className="fw-semibold mb-2">
                    <i className="bi bi-book me-2"></i>
                    Нові надходження:
                  </h6>
                  <p className="mb-0">Щотижня оновлюємо колекцію новими книжками</p>
                </div>
                <div>
                  <h6 className="fw-semibold mb-2">
                    <i className="bi bi-people me-2"></i>
                    Читацький клуб:
                  </h6>
                  <p className="mb-0">Зустрічі кожного четверга о 18:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddNewsModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddNews}
      />
    </div>
  );
}

export default HomePage;
