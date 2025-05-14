import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Валідація
    if (formData.password !== formData.confirmPassword) {
      setError("Паролі не співпадають");
      return;
    }
    if (formData.password.length < 6) {
      setError("Пароль повинен містити щонайменше 6 символів");
      return;
    }

    try {
      // 1. Реєстрація користувача
      await axios.post("http://localhost:5000/api/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      // 2. Автоматичний вхід після реєстрації
      const loginResponse = await axios.post(
        "http://localhost:5000/api/login",
        {
          username: formData.username,
          password: formData.password,
        }
      );

      // 3. Збереження токена
      localStorage.setItem("token", loginResponse.data.token);
      localStorage.setItem("userId", loginResponse.data.id);

      // 4. Встановлення статусу успіху
      setSuccess(true);

      // 5. Перенаправлення на головну сторінку через 1 секунду
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || "Помилка реєстрації");
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Реєстрація</h2>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && (
                <div className="alert alert-success">
                  Реєстрація успішна! Перенаправляємо на головну сторінку...
                </div>
              )}

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
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="form-control"
                    value={formData.email}
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
                <div className="mb-3">
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Підтвердіть пароль"
                    className="form-control"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Зареєструватися
                </button>
              </form>

              <div className="mt-3 text-center">
                <small>
                  Вже маєте акаунт? <Link to="/login">Увійти</Link>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
