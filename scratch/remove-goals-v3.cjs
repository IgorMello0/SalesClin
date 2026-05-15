const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

let startIndex = content.indexOf('<div className="mt-6 space-y-2">');
while (startIndex !== -1) {
  let endIndex = content.indexOf('</div>', startIndex); // finds the closing div of the flex row inside
  endIndex = content.indexOf('</div>', endIndex + 1); // finds the closing div of the progress bar wrapper
  endIndex = content.indexOf('</div>', endIndex + 1); // finds the closing div of the main wrapper

  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex + 6);
  }
  startIndex = content.indexOf('<div className="mt-6 space-y-2">');
}

fs.writeFileSync('src/pages/Dashboard.tsx', content);
console.log('Final removal script ran successfully.');
