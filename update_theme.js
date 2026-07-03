const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  // Theme Colors
  { regex: /#141414/gi, replacement: '#002147' },
  { regex: /bg-black/g, replacement: 'bg-[#002147]' },
  { regex: /from-black/g, replacement: 'from-[#002147]' },
  { regex: /via-black/g, replacement: 'via-[#002147]' },
  { regex: /to-black/g, replacement: 'to-[#002147]' },
  { regex: /#ea7e5c/gi, replacement: '#FF5530' },
  { regex: /orange-500/g, replacement: '[#FF5530]' },
  { regex: /orange-600/g, replacement: '[#B54236]' },

  // Romanian to English Translations
  { regex: /Acasă/g, replacement: 'Home' },
  { regex: /Cursuri Completate/g, replacement: 'Completed Courses' },
  { regex: /Cursuri/g, replacement: 'Courses' },
  { regex: /Lista Mea/g, replacement: 'My List' },
  { regex: /Lecții/g, replacement: 'Lessons' },
  { regex: /Lecția/g, replacement: 'Lesson' },
  { regex: /Redare/g, replacement: 'Play' },
  { regex: /Mai multe info/g, replacement: 'More Info' },
  { regex: /Recomandate pentru tine/gi, replacement: 'Recommended For You' },
  { regex: /În Listă/gi, replacement: 'In List' },
  { regex: /Adaugă în Listă/gi, replacement: 'Add to List' },
  { regex: /Începe Cursul/gi, replacement: 'Start Course' },
  { regex: /Continuă/gi, replacement: 'Continue' },
  { regex: /Evaluare/gi, replacement: 'Rating' },
  { regex: /Studenți/gi, replacement: 'Students' },
  { regex: /Curs 111/g, replacement: 'Course 111' }, // Usually from mock
  { regex: /Fundamentele Culinare/g, replacement: 'Culinary Fundamentals' },
  { regex: /Masterclass Fotografie/g, replacement: 'Photography Masterclass' },
  { regex: /Dezvoltare Web Avansată/g, replacement: 'Advanced Web Development' },
  { regex: /Design Grafic/g, replacement: 'Graphic Design' },
  { regex: /Management și Leadership/g, replacement: 'Management and Leadership' },
  { regex: /Dezvoltare/g, replacement: 'Development' },
  { regex: /Management/g, replacement: 'Management' },
  { regex: /Setări/g, replacement: 'Settings' },
  { regex: /Deconectare/g, replacement: 'Logout' },
  { regex: /Profilul Meu/g, replacement: 'My Profile' },
  { regex: /Salvează/g, replacement: 'Save' },
  { regex: /anulează/gi, replacement: 'Cancel' },
  { regex: /Înapoi/g, replacement: 'Back' },
  { regex: /rezultate/gi, replacement: 'results' },
  { regex: /caută/gi, replacement: 'search' },
  { regex: /Caută/g, replacement: 'Search' },
  { regex: /niciun rezultat/gi, replacement: 'no results' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let originalContent = content;

      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Update complete.');
