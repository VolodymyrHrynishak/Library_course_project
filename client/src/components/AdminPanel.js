import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Перевірка прав адміна при завантаженні
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Декодуємо токен для перевірки ролі
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      if (decoded.role !== "admin") {
        navigate("/");
      }
    } catch (err) {
      console.error("Помилка декодування токена:", err);
      navigate("/login");
    }

    fetchUsers();
  }, [navigate]);

  // Отримання списку користувачів
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/admin/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUsers(response.data.users);
    } catch (err) {
      setError(
        err.response?.data?.error || "Помилка завантаження користувачів"
      );
    } finally {
      setLoading(false);
    }
  };

  // Блокування/розблокування користувача
  const toggleUserBan = async (userId, isBanned) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/admin/users/${userId}/ban`,
        { isBanned: !isBanned },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchUsers(); // Оновлюємо список після змін
    } catch (err) {
      setError(
        err.response?.data?.error || "Помилка оновлення статусу користувача"
      );
    }
  };

  // Пошук користувачів
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Завантаження...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Адмін-панель</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h4>Управління користувачами</h4>
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Пошук користувачів..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ім'я користувача</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className={`badge ${
                            user.role === "admin" ? "bg-danger" : "bg-primary"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            user.is_banned ? "bg-warning" : "bg-success"
                          }`}
                        >
                          {user.is_banned ? "Заблокований" : "Активний"}
                        </span>
                      </td>
                      <td>
                        {user.role !== "admin" && (
                          <button
                            className={`btn btn-sm ${
                              user.is_banned ? "btn-success" : "btn-warning"
                            }`}
                            onClick={() =>
                              toggleUserBan(user.id, user.is_banned)
                            }
                          >
                            {user.is_banned ? "Розблокувати" : "Заблокувати"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">
                      Користувачів не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
