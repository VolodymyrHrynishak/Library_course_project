import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Navbar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  // Додаємо стан для відстеження авторизації
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");
      setIsLoggedIn(!!token);
      setIsAdmin(userRole === "admin");
    };

    // Перевіряємо стан при завантаженні
    checkAuth();

    // Підписуємось на зміни в localStorage
    window.addEventListener("storage", checkAuth);

    // Відписуємось при видаленні компонента
    return () => {
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  const handleLogout = () => {
    // 1. Очищаємо дані авторизації
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");

    // 2. Оновлюємо стан
    setIsLoggedIn(false);
    setIsAdmin(false);

    // 3. Перенаправляємо на головну
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg" style={{ 
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)'
    }}>
      <div className="container-fluid">
        <Link className="navbar-brand" to="/" style={{ color: 'var(--text-primary)' }}>
          Бібліотека
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/" style={{ color: 'var(--text-primary)' }}>
                Головна
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/book-list" style={{ color: 'var(--text-primary)' }}>
                Каталог
              </Link>
            </li>

            {isLoggedIn && isAdmin && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/admin" style={{ color: 'var(--text-primary)' }}>
                    Адмінка
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/add-book" style={{ color: 'var(--text-primary)' }}>
                    Додати книгу
                  </Link>
                </li>
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            <button 
              onClick={toggleTheme} 
              className="btn btn-outline-secondary rounded-pill px-3"
              style={{ 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              {isDarkMode ? (
                <i className="bi bi-sun-fill"></i>
              ) : (
                <i className="bi bi-moon-fill"></i>
              )}
            </button>

            {isLoggedIn ? (
              <button 
                onClick={handleLogout} 
                className="btn btn-outline-secondary rounded-pill px-3"
                style={{ 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                Вийти
              </button>
            ) : (
              <Link 
                to="/login" 
                className="btn btn-primary rounded-pill px-3"
                style={{ 
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-color)'
                }}
              >
                Увійти
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
