const { execSync } = require('child_process');

const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

console.log(`Checking syntax for ${files.length} file(s)...`);

let hasError = false;

for (const file of files) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Syntax Error in ${file}`);
    hasError = true;
  }
}

if (hasError) {
  console.error("Syntax check failed. Please fix the errors before committing.");
  process.exit(1);
} else {
  console.log("Syntax check passed!");
  process.exit(0);
}
