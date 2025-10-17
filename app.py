from flask import Flask, render_template, jsonify, request
import random
from collections import deque

app = Flask(__name__, static_folder="static", template_folder="templates")

DIFFICULTY_MAP = {
    "easy": 0.75,
    "medium": 0.6,
    "hard": 0.45
}

def generate_maze(n=10, difficulty="medium"):
    p_open = DIFFICULTY_MAP.get(difficulty, 0.6)
    maze = [[0 for _ in range(n)] for _ in range(n)]

    def carve_valid_path():
        path = [(0, 0)]
        x, y = 0, 0
        maze[x][y] = 1
        while (x, y) != (n - 1, n - 1):
            choices = []
            if x < n - 1: choices.append((x + 1, y))
            if y < n - 1: choices.append((x, y + 1))
            if x > 0 and random.random() < 0.25: choices.append((x - 1, y))
            if y > 0 and random.random() < 0.25: choices.append((x, y - 1))
            if not choices:
                break
            x, y = random.choice(choices)
            maze[x][y] = 1
            path.append((x, y))
        maze[n - 1][n - 1] = 1
        return path

    carve_valid_path()

    for r in range(n):
        for c in range(n):
            if maze[r][c] == 0:
                if random.random() < p_open * 0.7:
                    maze[r][c] = 1

    if not solve_maze(maze):
        for r in range(n):
            for c in range(n):
                if (r, c) not in [(0, 0), (n - 1, n - 1)]:
                    if random.random() < 0.5:
                        maze[r][c] = 1
        maze[n - 1][n - 2] = 1
        maze[n - 2][n - 1] = 1

    open_ratio = sum(cell for row in maze for cell in row) / (n * n)
    if open_ratio < 0.5:
        for r in range(n):
            for c in range(n):
                if maze[r][c] == 0 and random.random() < 0.3:
                    maze[r][c] = 1
    elif open_ratio > 0.8:
        for r in range(n):
            for c in range(n):
                if maze[r][c] == 1 and random.random() < 0.2:
                    maze[r][c] = 0
        maze[0][0] = 1
        maze[n - 1][n - 1] = 1

    return maze

def in_bounds(n, x, y):
    return 0 <= x < n and 0 <= y < n

def solve_maze(matrix):
    n = len(matrix)
    if n == 0 or matrix[0][0] == 0 or matrix[n-1][n-1] == 0:
        return []

    visited = [[False]*n for _ in range(n)]
    parent = [[None]*n for _ in range(n)]
    stack = [(0,0)]
    visited[0][0] = True

    dirs = [(1,0),(0,1),(-1,0),(0,-1)]
    while stack:
        x,y = stack.pop()
        if (x,y) == (n-1,n-1):
            path = []
            cur = (x,y)
            while cur:
                path.append(cur)
                cur = parent[cur[0]][cur[1]]
            path.reverse()
            return path
        for dx,dy in dirs:
            nx,ny = x+dx, y+dy
            if in_bounds(n,nx,ny) and not visited[nx][ny] and matrix[nx][ny] == 1:
                visited[nx][ny] = True
                parent[nx][ny] = (x,y)
                stack.append((nx,ny))
    return []

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate")
def generate():
    try:
        n = int(request.args.get("size", 10))
        difficulty = request.args.get("difficulty", "medium")
    except:
        n = 10
        difficulty = "medium"
    maze = generate_maze(n, difficulty)
    solution = solve_maze(maze)
    return jsonify({"maze": maze, "solution": solution})

@app.route("/solve", methods=["POST"])
def solve():
    data = request.get_json()
    matrix = data.get("maze", [])
    solution = solve_maze(matrix)
    return jsonify({"solution": solution})

if __name__ == "__main__":
    app.run(debug=True)