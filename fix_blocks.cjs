const fs = require('fs');

let modalOld = fs.readFileSync('modal_old.tsx', 'utf8').replace(/\r\n/g, '\n');
let originalFile = fs.readFileSync('src/pages/SalesFunnel.tsx', 'utf8').replace(/\r\n/g, '\n');

function extractBlockRegex(regex) {
  let match = modalOld.match(regex);
  if (!match) throw new Error('Could not find match for regex');
  return match[0];
}

const nameLogic = extractBlockRegex(/\{isEditingName \? \([\s\S]*?<\/button>\s*<\/>\s*\)\}/);
const phoneLogic = extractBlockRegex(/\{isEditingPhone \? \([\s\S]*?<\/button>\s*<\/div>\s*\)\}/);
const emailLogic = extractBlockRegex(/\{isEditingEmail \? \([\s\S]*?<\/button>\s*<\/div>\s*\)\}/);
const originLogic = extractBlockRegex(/\{isEditingOrigin \? \([\s\S]*?<\/button>\s*<\/div>\s*\)\}/);

let brokenName = originalFile.match(/\{isEditingName \? \([\s\S]*?onChange=\{\(e\) => setTempName\(e\.target\.value\)\}\n\s*<\/div>/);
if (brokenName) {
  let modifiedName = nameLogic.replace('className="text-lg sm:text-xl', 'className="text-2xl text-center').replace('className="text-xl sm:text-2xl', 'className="text-2xl text-center');
  originalFile = originalFile.replace(brokenName[0], modifiedName);
}

let bp2 = originalFile.match(/\{isEditingPhone \? \([\s\S]*?onChange=\{\(e\) => setTempPhone\(e\.target\.value\)\}/);
if (bp2) originalFile = originalFile.replace(bp2[0], phoneLogic);

let brokenEmail = originalFile.match(/\{isEditingEmail \? \([\s\S]*?onChange=\{\(e\) => setTempEmail\(e\.target\.value\)\}/);
if (brokenEmail) originalFile = originalFile.replace(brokenEmail[0], emailLogic);

let bo2 = originalFile.match(/\{isEditingOrigin \? \([\s\S]*?saveOrigin\(val\);\s*\}\}>\n?\s*<\/div>/);
if (bo2) originalFile = originalFile.replace(bo2[0], originLogic);

fs.writeFileSync('src/pages/SalesFunnel.tsx', originalFile);
