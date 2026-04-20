import sys

file_path = r'c:\Users\Matheus Scorza\RPI Tool\RPI-LOARA\src\pages\CondutorRPI.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix line 629 (index 628)
# We need to remove the extra </div>
# In previous versions, we saw:
# 627:                    )}
# 628:                 </div>
# 629:               </div>
# 630: 
# 631:               {/* Revenue goal narrative */}

# Let's find the block precisely.
found = False
for i in range(len(lines)):
    if 'Saúde: Engajado' in lines[i]:
        # Check surrounding
        if i + 3 < len(lines) and '</div>' in lines[i+3] and '</div>' in lines[i+4]:
            print(f"Found problematic block at line {i+1}")
            # lines[i+4] is the extra div (index i+4)
            del lines[i+4]
            found = True
            break

if found:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fixed extra div at line 629.")
else:
    print("Could not find the problematic block at 629 via script. Trying index-based fix if plausible.")
    # Fallback to absolute index if we are confident ( risky )
    # Let's try to find line 1205/1206 fix too.
    pass

# Fix line 1205/1206 (erroneous removal)
# Before:
# 1204:                    ))}
# 1205:                 </div>
# 1206:              </div>
# 1207:             )}

# After my bad edit:
# 1204:                    ))}
# 1205:                 </div>
# 1206:             )}

found_1205 = False
for i in range(len(lines)):
    if 'Object.entries(duvidas).filter(([_, d]) => d.checked && !d.resolved)' in lines[i]:
        # This is line 1210 approximately.
        # Let's look back.
        for j in range(i, i-10, -1):
            if '))}' in lines[j] and '</div>' in lines[j+1] and ')}' in lines[j+2]:
                print(f"Found missing div at line {j+1}")
                # We need to add one </div> before line j+2 ( index j+2 )
                lines.insert(j+2, '                </div>\n')
                found_1205 = True
                break
        if found_1205: break

if found_1205:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Restored missing div at line 1206.")
else:
    print("Could not find the missing div at 1206 via script.")
