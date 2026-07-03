#!/bin/bash

# Replace #141414 with #2C3E68 (Navy Blue)
find ./components -type f -name "*.tsx" -exec sed -i 's/#141414/#2C3E68/g' {} +

# Replace #E50914 with #EA7E5C (Orange)  
find ./components -type f -name "*.tsx" -exec sed -i 's/#E50914/#EA7E5C/g' {} +
find ./components -type f -name "*.tsx" -exec sed -i 's/#f6121d/#FF9570/g' {} +

# Replace in App.tsx
sed -i 's/#141414/#2C3E68/g' ./App.tsx
sed -i 's/#E50914/#EA7E5C/g' ./App.tsx
sed -i 's/#f6121d/#FF9570/g' ./App.tsx

echo "Color replacement complete!"
