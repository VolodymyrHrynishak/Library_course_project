import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:5000/api/login",
        formData
      );

      // Зберігаємо всі необхідні дані
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userId", response.data.id);
      localStorage.setItem("userRole", response.data.role);
      localStorage.setItem("username", response.data.username); // Для відображення в інтерфейсі

      // Перенаправляємо на головну
      navigate("/");

      // Оновлюємо сторінку для застосування змін
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || "Невірний логін або пароль");
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Вхід</h2>
              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <input
                    type="text"
                    name="username"
                    placeholder="Ім'я користувача"
                    className="form-control"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="password"
                    name="password"
                    placeholder="Пароль"
                    className="form-control"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100 mb-3">
                  Увійти
                </button>

                <div className="text-center">
                  <Link
                    to="/register"
                    className="btn btn-outline-secondary w-100"
                  >
                    Зареєструватися
                  </Link>
                </div>
              </form>

              <div className="mt-3 text-center">
                <small>
                  <Link to="/forgot-password">Забули пароль?</Link>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Login;
