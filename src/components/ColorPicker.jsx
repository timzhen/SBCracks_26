import React from 'react';

const COLORS = [
    '#4285F4', '#34A853', '#EA4335', '#FBBC04',
    '#FF6D01', '#9334E6', '#A142F4', '#0F9D58'
];

export default function ColorPicker({ selectedColor, onColorSelect, isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="color-picker-modal active" onClick={(e) => e.stopPropagation()}>
            <div className="color-picker-content">
                <div className="color-options">
                    {COLORS.map(color => (
                        <div
                            key={color}
                            className="color-option"
                            style={{ backgroundColor: color }}
                            onClick={() => onColorSelect(color)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

