import React from 'react';
import { adminStyles } from '../../styles/adminStyles';

const CategoryModal = ({
  show,
  categories,
  newCategory,
  onClose,
  onAddCategory,
  onNewCategoryChange
}) => {
  if (!show) return null;

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      alert('카테고리명을 입력해주세요.');
      return;
    }
    
    if (categories.includes(newCategory)) {
      alert('이미 존재하는 카테고리입니다.');
      return;
    }
    
    onAddCategory(newCategory);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    }
  };

  return (
    <div style={adminStyles.modal}>
      <div style={adminStyles.modalContent}>
        <h3 style={adminStyles.modalTitle}>🏷️ 카테고리 관리</h3>
        
        <div style={adminStyles.categoryList}>
          <h4>현재 카테고리</h4>
          <div>
            {categories.map(cat => (
              <span key={cat} style={adminStyles.categoryTag}>
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div style={adminStyles.formGroup}>
          <label style={adminStyles.label}>새 카테고리 추가</label>
          <div style={adminStyles.addCategoryForm}>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => onNewCategoryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              style={adminStyles.input}
              placeholder="카테고리명 입력"
            />
            <button 
              type="button" 
              onClick={handleAddCategory}
              style={adminStyles.addButton}
            >
              추가
            </button>
          </div>
        </div>

        <div style={adminStyles.modalButtons}>
          <button 
            type="button" 
            onClick={onClose}
            style={adminStyles.cancelButton}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;