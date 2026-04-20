import sys

file_path = r'c:\Users\Matheus Scorza\RPI Tool\RPI-LOARA\src\pages\CondutorRPI.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
for i in range(len(lines)):
    if 'Saúde: Engajado' in lines[i]:
        # Move forward to find the next </div>
        for j in range(i+1, i+10):
            if '</div>' in lines[j] and 'Revenue goal narrative' in lines[j+2]:
                print(f"Found wrong </div> at line {j+1}")
                del lines[j]
                found = True
                break
        if found: break

if found:
    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.writelines(lines)
    print("Fixed extra div at line 628.")
else:
    print("Could not find the problematic </div>.")
