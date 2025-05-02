# Initialize a Git repository (run this once)
git init

# Stage all files
git add .

# Commit the files with a message
git commit -m "Initial commit"

# Rename the default branch to 'main'
git branch -M main

# Link your local repo to the GitHub repository
git remote add origin https://github.com/TVMediaMA/TV-Media.git

# Push your changes to GitHub
git push -u origin main

git add .
git commit -m "Make logo clickable and add hover effect"
git pull origin main --allow-unrelated-histories
git push origin main
