import React, { useState } from "react";

function AddNewsModal({ show, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      if (image) {
        formData.append("image", image);
      }
      onSubmit(formData);
      setTitle("");
      setContent("");
      setImage(null);
      setPreview("");
    }
  };

  if (!show) return null;

  return (
    <div
      className="modal show fade d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content animate__animated animate__fadeInDown">
          <div className="modal-header">
            <h5 className="modal-title">Додати новину</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Заголовок</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Зображення</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {preview && (
                  <div className="mt-2 text-center">
                    <img
                      src={preview}
                      alt="Попередній перегляд"
                      className="img-fluid rounded shadow"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">Зміст</label>
                <textarea
                  className="form-control"
                  rows="8"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={onClose}
                >
                  Скасувати
                </button>
                <button type="submit" className="btn btn-primary">
                  Опублікувати
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddNewsModal;
