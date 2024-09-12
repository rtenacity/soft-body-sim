const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight - 100;

let g = 500;  // Constant gravitational acceleration in pixels per second^2
let force_x = 0;
let damp_constant = 0.5;

function distance(p0, p1) {
    let dx = p1.x - p0.x;
    let dy = p1.y - p0.y;
    return Math.sqrt(dx * dx + dy * dy);
}

class Point {
    constructor(x, y, mass, pinned) {
        this.x = x;
        this.y = y;
        this.old_x = x;
        this.old_y = y;
        this.mass = mass;
        this.pinned = pinned;
        this.radius = 5;
    }

    update(dt) {
        if (!this.pinned) {
            let vel_x = (this.x - this.old_x);
            let vel_y = (this.y - this.old_y);

            this.old_x = this.x;
            this.old_y = this.y;

            // Apply constant acceleration for gravity (g)
            let acc_x = force_x / this.mass;
            let acc_y = g;  // Gravity is a constant acceleration, no need to divide by mass

            this.x += vel_x + acc_x * dt * dt;
            this.y += vel_y + acc_y * dt * dt;
        }
    }

    constrain() {
        let vel_x = (this.x - this.old_x);
        let vel_y = (this.y - this.old_y);
        if (this.x < 0) {
            this.x = 0;
            this.old_x = this.x + vel_x * damp_constant;
        } else if (this.x > SCREEN_WIDTH) {
            this.x = SCREEN_WIDTH;
            this.old_x = this.x + vel_x * damp_constant;
        }
        if (this.y < 0) {
            this.y = 0;
            this.old_y = this.y + vel_y * damp_constant;
        } else if (this.y > SCREEN_HEIGHT) {
            this.y = SCREEN_HEIGHT;
            this.old_y = this.y + vel_y * damp_constant;
        }
    }

    render() {
        noStroke();
        fill(255, 100);
        circle(this.x, this.y, this.radius * 2);
    }
}

class Ball extends Point {
    constructor(x, y, mass, radius) {
        super(x, y, mass, false);
        this.radius = radius;
    }

    render() {
        noStroke();
        fill(255, 0, 0);
        circle(this.x, this.y, this.radius * 2);
    }

    constrain() {
        let vel_x = (this.x - this.old_x);
        let vel_y = (this.y - this.old_y);
        if (this.x < 0) {
            this.x = 0;
            this.old_x = this.x + vel_x * damp_constant;
        } else if (this.x > SCREEN_WIDTH) {
            this.x = SCREEN_WIDTH;
            this.old_x = this.x + vel_x * damp_constant;
        }
        if (this.y < 0) {
            this.y = 0;
            this.old_y = this.y + vel_y * damp_constant;
        } else if (this.y > SCREEN_HEIGHT) {
            this.y = SCREEN_HEIGHT;
            this.old_y = this.y + vel_y * damp_constant;
        }
    }
}

class Link {
    constructor(p0, p1, restLength) {
        this.p0 = p0;
        this.p1 = p1;
        this.restLength = restLength;
    }

    update() {
        let dx = this.p1.x - this.p0.x;
        let dy = this.p1.y - this.p0.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        let diff = this.restLength - dist;
    
        let moveX = (dx / dist) * diff * 0.9;
        let moveY = (dy / dist) * diff * 0.9;
    
        if (!this.p0.pinned && !this.p1.pinned) {
            this.p0.x -= moveX;
            this.p0.y -= moveY;
            this.p1.x += moveX;
            this.p1.y += moveY;
        } else if (!this.p0.pinned) {
            this.p0.x -= moveX * 2;
            this.p0.y -= moveY * 2;
        } else if (!this.p1.pinned) {
            this.p1.x += moveX * 2;
            this.p1.y += moveY * 2;
        }
    }
    
    
    

    render() {
        stroke(200, 100);
        line(this.p0.x, this.p0.y, this.p1.x, this.p1.y);
    }
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    let A = px - x1;
    let B = py - y1;
    let C = x2 - x1;
    let D = y2 - y1;

    let dot = A * C + B * D;
    let len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) {
        param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    let dx = px - xx;
    let dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

class SoftBody {
    constructor(x, y, width, height, rows, cols) {
        this.points = [];
        this.links = [];

        // Create points
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let px = x + j * (width / (cols - 1));
                let py = y + i * (height / (rows - 1));
                let pinned = (i === 0 && (j === 0 || j === cols - 1));
                this.points.push(new Point(px, py, 5, false));
            }
        }

        // Create links
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let index = i * cols + j;

                if (j < cols - 1) {
                    this.links.push(new Link(this.points[index], this.points[index + 1], width / (cols - 1)));
                }

                if (i < rows - 1) {
                    this.links.push(new Link(this.points[index], this.points[index + cols], height / (rows - 1)));
                }

                if (i < rows - 1 && j < cols - 1) {
                    this.links.push(new Link(this.points[index], this.points[index + cols + 1],
                        Math.sqrt(Math.pow(width / (cols - 1), 2) + Math.pow(height / (rows - 1), 2))));
                }
            }
        }
    }

    checkCollision(ball) {
    }

    update(dt) {
        for (let point of this.points) {
            point.update(dt);
        }

        // Multiple iterations to stabilize the constraints
        for (let i = 0; i < 20; i++) {
            for (let link of this.links) {
                link.update();
            }
        }

        for (let point of this.points) {
            point.constrain();
        }
    }

    render() {
        for (let link of this.links) {
            link.render();
        }

        for (let point of this.points) {
            point.render();
        }
    }
}

// Global variables
let softBody;
let ball;

function setup() {
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT + 100);
    softBody = new SoftBody(100, SCREEN_HEIGHT - 500, 200, 100, 4, 8); // x, y, width, height, rows, cols
    ball = new Ball(150, 50, 25, 10);
}

function draw() {
    background(0);

    let dt = deltaTime / 1000;

    softBody.update(dt);
    ball.update(dt);

    softBody.checkCollision(ball);

    ball.constrain();

    softBody.render();
    ball.render();
}