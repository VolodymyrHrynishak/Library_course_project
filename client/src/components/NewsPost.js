import React from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

function NewsPost({ post, isAdmin, onDelete }) {
  return (
    <div 
      className="card mb-4 border-0 shadow-sm rounded-4 animate__animated animate__fadeIn"
      style={{ transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      }}
    >
      {post.image_url && (
        <div style={{ 
          height: "300px", 
          overflow: "hidden",
          borderTopLeftRadius: '1rem',
          borderTopRightRadius: '1rem'
        }}>
          <img
            src={`http://localhost:5000${post.image_url}`}
            className="w-100 h-100"
            alt={post.title || "Зображення новини"}
            style={{ objectFit: "cover" }}
            loading="lazy"
          />
        </div>
      )}
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
          <h2 className="card-title h4 fw-bold mb-0">{post.title}</h2>
          {isAdmin && (
            <button
              className="btn btn-sm btn-outline-danger rounded-pill px-3"
              onClick={() => {
                if (
                  window.confirm("Ви впевнені, що хочете видалити цю новину?")
                ) {
                  onDelete(post.id);
                }
              }}
              style={{ transition: 'all 0.3s ease' }}
            >
              <i className="bi bi-trash me-1"></i>
              Видалити
            </button>
          )}
        </div>
        <p className="card-text text-muted small mb-4">
          <i className="bi bi-clock me-1"></i>
          Опубліковано:{" "}
          {format(new Date(post.created_at), "dd MMMM yyyy, HH:mm", {
            locale: uk,
          })}
        </p>
        <div className="card-text">
          {post.content &&
            post.content
              .split("\n")
              .map((paragraph, i) => (
                <p key={i} className="mb-3" style={{ lineHeight: '1.6' }}>
                  {paragraph}
                </p>
              ))}
        </div>
      </div>
    </div>
  );
}

export default NewsPost;
