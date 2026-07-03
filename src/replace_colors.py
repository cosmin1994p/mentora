#!/usr/bin/env python3
import os
import re

# Define color mappings
COLOR_REPLACEMENTS = {
    '#141414': '#2C3E68',  # Navy Blue background
    '#E50914': '#EA7E5C',  # Orange primary
    '#f6121d': '#FF9570',  # Orange hover/light
}

# Files to process
FILES_TO_PROCESS = [
    './components/Hero.tsx',
    './components/CourseDetail.tsx',
    './components/AuthModal.tsx',
    './components/NotificationsPanel.tsx',
    './components/CourseGrid.tsx',
    './components/VideoPlayer.tsx',
    './components/MoodModal.tsx',
    './components/ReelViewer.tsx',
    './components/WelcomeTour.tsx',
    './components/SearchModal.tsx',
]

def replace_colors_in_file(filepath):
    """Replace all color codes in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace each color
        for old_color, new_color in COLOR_REPLACEMENTS.items():
            content = content.replace(old_color, new_color)
        
        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated: {filepath}")
            return True
        else:
            print(f"⏭️  No changes needed: {filepath}")
            return False
    
    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        return False
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False

def main():
    print("🎨 Starting color replacement...")
    print(f"Replacements: {COLOR_REPLACEMENTS}\n")
    
    updated_count = 0
    for filepath in FILES_TO_PROCESS:
        if replace_colors_in_file(filepath):
            updated_count += 1
    
    print(f"\n✨ Done! Updated {updated_count} files.")

if __name__ == '__main__':
    main()
