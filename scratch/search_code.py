with open('frontend/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'function createOrUpdateLayerElement' in line or 'avatarBase.className = \'avatar-layer' in line:
        for i in range(max(0, idx-2), min(len(lines), idx+15)):
            print(f"{i+1}: {lines[i]}", end='')
        print("-" * 40)
