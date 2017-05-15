
function get(id) {
    return document.getElementById(id);
};

function hide(id) {
    get(id).style.visibility = "hidden";
};

function show(id) {
    get(id).style.visibility = "visible";
};

function setHTML(id, html) {
    get(id).innerHTML = html;
};

function getTime() {
    return new Date().getTime();
};

function random(min, max) {
    return (min + (Math.random() * (max - min)));
};

function randomChoice(choices) {
    return choices[Math.round(random(0, choices.lenght - 1))];
};

if (!window.requestAnimationFrame) { // http://msdn.microsoft.com/ru-ru/library/ie/hh920765(v=vs.85).aspx
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback, element) {
        window.setTimeout(callback, 1000 / 60);
    }
}

var KEY = {  ESC: 27, SPACE: 53, LEFT: 52, UP: 50, RIGHT: 54, DOWN: 56 },
DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 },
canvas = get('canvas'),
ctx = canvas.getContext('2d'),
ucanvas = get('upcoming'),
uctx = ucanvas.getContext('2d'),
speed = { start: 0.6, decrement: 0.015, min: 0.05 },
nx = 10,
ny = 20,
nu = 5;

var dx, dy, blocks, actions, playing, dt, current, next, score, vscore, rows, step;

var i = { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'PaleTurquoise' },
j = { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: '#FF9933' },
l = { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'Orchid' },
o = { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: '#FFFF66' },
s = { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: '#CC6633' },
t = { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'MediumPurple' },
z = { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: '#99CC33' };

function eachBlock(type, x, y, dir, fn) {
    var bit, result, row = 0, col = 0, blocks = type.blocks[dir];
    for (bit = 0x8000; bit > 0; bit = bit >> 1) {
        if (blocks & bit) {
            fn(x + col, y + row);
        }
        if (++col === 4) {
            col = 0;
            row++;
        }
    }
};

function checkOccup(type, x, y, dir) {
    var result = false;
    eachBlock(type, x, y, dir, function (x, y) {
        if (x < 0 || x >= nx || y < 0 || y >= ny || getBlock(x, y))
            result = true;
    });
    return result;
};

function checkUnoccup(type, x, y, dir) {
    return !checkOccup(type, x, y, dir);
};

var pieces = [];
function randomPiece() {
    if (pieces.length == 0)
        pieces = [i, i, i, i, j, j, j, j, l, l, l, l, o, o, o, o, s, s, s, s, t, t, t, t, z, z, z, z];
    var type = pieces.splice(random(0, pieces.length - 1), 1)[0];
    return { type: type, dir: DIR.UP, x: Math.round(random(0, nx - type.size)), y: 0 };
};

function gameloop() {
    addEvents();
    var last = now = getTime();
    function frame() {
        now = getTime();
        update(Math.min(1, (now - last) / 1000.0));
        draw();
        last = now;
        requestAnimationFrame(frame, canvas);
    }
    resize();
    reset();
    frame();
};

function addEvents() {
    document.addEventListener("keydown", keydown, false);
    window.addEventListener("resize", resize, false);
};

function resize(event) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ucanvas.width = ucanvas.clientWidth;
    ucanvas.height = ucanvas.clientHeight;
    dx = canvas.width / nx;
    dy = canvas.height / ny;
    invalidate();
    invalidateNext();
};

function keydown(event) {
    var handled = false;
    if (playing) {
        switch (event.keyCode) {
            case KEY.LEFT: actions.push(DIR.LEFT); handled = true; break;
            case KEY.RIGHT: actions.push(DIR.RIGHT); handled = true; break;
            case KEY.UP: actions.push(DIR.UP); handled = true; break;
            case KEY.DOWN: actions.push(DIR.DOWN); handled = true; break;
            case KEY.ESC: lose(); handled = true; break;
        }
    }
    else if (event.keyCode == KEY.SPACE) {
        play();
        handled = true;
    }
    if (handled)
        event.preventDefault();
};

function play() {
    hide("start");
    reset();
    playing = true;
};

function lose() {
    show("start");
    setVisualScore();
    playing = false;
};

function setVisualScore(n) {
    vscore = n || score;
    invalidateScore();
};

function setScore(n) {
    score = n;
    setVisualScore(n);
};

function addScore(n) {
    score = score + n;
};

function clearScore() {
    setScore(0);
};

function setRows(n) {
    rows = n;
    step = Math.max(speed.min, speed.start - (speed.decrement * rows));
    invalidateRows();
};

function addRows(n) {
    setRows(rows + n);
};

function clearRows() {
    setRows(0);
};

function getBlock(x, y) {
    return (blocks && blocks[x] ? blocks[x][y] : null);
};

function setBlock(x, y, type) {
    blocks[x] = blocks[x] || [];
    blocks[x][y] = type;
    invalidate();
};

function clearBlocks() {
    blocks = [];
    invalidate();
};

function clearActions() {
    actions = [];
};

function setCurrentPiece(piece) {
    current = piece || randomPiece();
    invalidate();
};

function setNextPiece(piece) {
    next = piece || randomPiece();
    invalidateNext();
};

function reset() {
    dt = 0;
    clearActions();
    clearBlocks();
    clearRows();
    clearScore();
    setCurrentPiece(next);
    setNextPiece();
};

function update(idt) {
    if (playing) {
        if (vscore < score)
            setVisualScore(vscore + 1);
        handle(actions.shift());
        dt = dt + idt;
        if (dt > step) {
            dt = dt - step;
            drop();
        }
    }
};

function handle(action) {
    switch (action) {
        case DIR.LEFT: move(DIR.LEFT); break;
        case DIR.RIGHT: move(DIR.RIGHT); break;
        case DIR.UP: rotate(); break;
        case DIR.DOWN: drop(); addScore(1); break;
    }
};

function move(dir) {
    var x = current.x, y = current.y;
    switch (dir) {
        case DIR.RIGHT: x = x + 1; break;
        case DIR.LEFT: x = x - 1; break;
        case DIR.DOWN: y = y + 1; break;
    }
    if (checkUnoccup(current.type, x, y, current.dir)) {
        current.x = x;
        current.y = y;
        invalidate();
        return true;
    }
    else
        return false;
};

function rotate(dir) {
    var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
    if (checkUnoccup(current.type, current.x, current.y, newdir)) {
        current.dir = newdir;
        invalidate();
    }
};

function drop() {
    if (!move(DIR.DOWN)) {
        addScore(10);
        dropPiece();
        removeLines();
        setCurrentPiece(next);
        setNextPiece(randomPiece());
        clearActions();
        if (checkOccup(current.type, current.x, current.y, current.dir))
            lose();
    }
};

function dropPiece() {
    eachBlock(current.type, current.x, current.y, current.dir, function (x, y) {
        setBlock(x, y, current.type);
    });
};

function removeLines() {
    var x, y, complete, n = 0;
    for (y = ny; y > 0; y--) {
        complete = true;
        for (x = 0; x < nx; x++) {
            if (!getBlock(x, y))
                complete = false;
        }
        if (complete) {
            removeLine(y);
            y = y + 1;
            n++;
        }
    }
    if (n > 0) {
        addRows(n);
        addScore(100 * Math.pow(2, n - 1));
    }
};

function removeLine(n) {
    var x, y;
    for (y = n; y >= 0; y--) {
        for (x = 0; x < nx; x++)
            setBlock(x, y, (y == 0) ? null : getBlock(x, y - 1));
    }
};

var invalid = {};

function invalidate() {
    invalid.court = true;
};

function invalidateNext() {
    invalid.next = true;
};

function invalidateScore() {
    invalid.score = true;
};

function invalidateRows() {
    invalid.rows = true;
};

function draw() {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.translate(0.5, 0.5);
    drawCourt();
    drawNext();
    drawScore();
    drawRows();
    ctx.restore();
};

function drawCourt() {
    if (invalid.court) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (playing)
            drawPiece(ctx, current.type, current.x, current.y, current.dir);
        var x, y, block;
        for (y = 0; y < ny; y++) {
            for (x = 0; x < nx; x++)
                if (block = getBlock(x, y))
                    drawBlock(ctx, x, y, block.color);
        }
    }
    ctx.strokeRect(0, 0, nx * dx - 1, ny * dy - 1);
    invalid.court = false;
};

function drawNext() {
    if (invalid.next) {
        var padding = (nu - next.type.size) / 2;
        uctx.save();
        uctx.translate(0.5, 0.5);
        uctx.clearRect(0, 0, nu * dx, nu * dy);
        drawPiece(uctx, next.type, padding, padding, next.dir);
        uctx.strokeStyle = "black";
        uctx.strokeRect(0, 0, nu * dx - 1, nu * dy - 1);
        uctx.restore();
        invalid.next = false;
    }
};

function drawScore() {
    if (invalid.score) {
        setHTML("score", ("00000" + Math.floor(vscore)).slice(-5));
        invalid.score = false;
    }
};

function drawRows() {
    if (invalid.rows) {
        setHTML("rows", rows);
        invalid.rows = false;
    }
};

function drawPiece(ctx, type, x, y, dir) {
    eachBlock(type, x, y, dir, function (x, y) {
        drawBlock(ctx, x, y, type.color);
    });
};

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * dy, y * dy, dx, dy);
    ctx.strokeRect(x * dy, y * dy, dx, dy);
};

gameloop();
