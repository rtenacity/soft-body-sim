// Constants
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight - 100;
const GRAVITY = 500; // pixels per second^2
const DAMPING = 0.5;
const CONSTRAINT_ITERATIONS = 100;

// Utility functions
const distance = (p0, p1) => Math.hypot(p1.x - p0.x, p1.y - p0.y);

// Base classes
class Point {
    constructor(x, y, mass = 1, pinned = false, radius = 5) {
        this.x = this.old_x = x;
        this.y = this.old_y = y;
        this.mass = mass;
        this.pinned = pinned;
        this.radius = radius;
        this.isDragged = false;
        this.color = color(255, 100);
    }

    update(dt, force_x = 0) {
        if (this.pinned || this.isDragged) return;

        const vel_x = this.x - this.old_x;
        const vel_y = this.y - this.old_y;

        this.old_x = this.x;
        this.old_y = this.y;

        const acc_x = force_x / this.mass;
        const acc_y = GRAVITY;

        this.x += vel_x + acc_x * dt * dt;
        this.y += vel_y + acc_y * dt * dt;
    }

    constrain() {
        if (this.pinned || this.isDragged) return;

        const vel_x = (this.x - this.old_x) * DAMPING;
        const vel_y = (this.y - this.old_y) * DAMPING;

        if (this.x < 0) { this.x = 0; this.old_x = this.x + vel_x; }
        else if (this.x > SCREEN_WIDTH) { this.x = SCREEN_WIDTH; this.old_x = this.x + vel_x; }

        if (this.y < 0) { this.y = 0; this.old_y = this.y + vel_y; }
        else if (this.y > SCREEN_HEIGHT) { this.y = SCREEN_HEIGHT; this.old_y = this.y + vel_y; }
    }

    render() {
        noStroke();
        fill(this.color);
        circle(this.x, this.y, this.radius * 2);
    }
}

class ElasticLink {
    constructor(p0, p1, restLength, restitution) {
        this.p0 = p0;
        this.p1 = p1;
        this.restLength = restLength;
        this.restitution = restitution;
    }

    update() {
        const dx = this.p1.x - this.p0.x;
        const dy = this.p1.y - this.p0.y;
        const dist = Math.hypot(dx, dy);
        const diff = (this.restLength - dist) / dist;

        const appliedDiff = diff * this.restitution;

        if (!this.p0.pinned && !this.p1.pinned && !this.p0.isDragged && !this.p1.isDragged) {
            this.p0.x -= 0.5 * appliedDiff * dx;
            this.p0.y -= 0.5 * appliedDiff * dy;
            this.p1.x += 0.5 * appliedDiff * dx;
            this.p1.y += 0.5 * appliedDiff * dy;
        } else if (!this.p0.pinned && !this.p0.isDragged) {
            this.p0.x -= appliedDiff * dx;
            this.p0.y -= appliedDiff * dy;
        } else if (!this.p1.pinned && !this.p1.isDragged) {
            this.p1.x += appliedDiff * dx;
            this.p1.y += appliedDiff * dy;
        }
    }

    render() {
        const dx = this.p1.x - this.p0.x;
        const dy = this.p1.y - this.p0.y;
        const dist = Math.hypot(dx, dy);

        const stretchRatio = dist / this.restLength * 1.2;

        const colorValue = map(stretchRatio, 1, 2, 0, 255); // 1 is rest length, 2 is twice the rest length
        const colorStretch = color(colorValue, 255 - colorValue, 0); // Green to red

        stroke(colorStretch);
        line(this.p0.x, this.p0.y, this.p1.x, this.p1.y);
    }
}


class SoftBody {
    constructor(x, y, width, height, rows, cols, restitution) {
        this.rows = rows;
        this.cols = cols;
        this.restitution = restitution;
        this.points = [];
        this.links = [];
        this.draggablePoints = [];

        const dx = width / (cols - 1);
        const dy = height / (rows - 1);

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const px = x + j * dx;
                const py = y + i * dy;
                const pinned = j === 0;
                const point = new Point(px, py, 5, pinned);
                this.points.push(point);

                if ((i === 0 && j === cols - 1) ||
                    (j === cols - 1 && (i === Math.floor(rows / 2)))) {
                    this.draggablePoints.push(point);
                }
            }
        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const index = i * cols + j;

                if (j < cols - 1) {
                    this.links.push(new ElasticLink(this.points[index], this.points[index + 1], dx, this.restitution)); // Horizontal link
                }

                if (i < rows - 1) {
                    this.links.push(new ElasticLink(this.points[index], this.points[index + cols], dy, this.restitution)); // Vertical link
                }

                if (i < rows - 1 && j < cols - 1) {
                    this.links.push(new ElasticLink(this.points[index], this.points[index + cols + 1], Math.hypot(dx, dy), this.restitution)); // Diagonal (bottom-left to top-right)
                }

                if (i < rows - 1 && j > 0) {
                    this.links.push(new ElasticLink(this.points[index], this.points[index + cols - 1], Math.hypot(dx, dy), this.restitution)); // Diagonal (bottom-right to top-left)
                }
            
            }
        }

        for (let i = 0; i < 20; i++) {
            this.links.push(new ElasticLink(this.points[cols - 1], this.points[(rows - 1) * cols + (cols - 1)], dy * (rows - 1), this.restitution));
            this.links.push(new ElasticLink(this.points[cols - 1], this.points[Math.floor(rows / 2) * cols + (cols - 1)], dy * Math.floor(rows / 2), this.restitution));
            this.links.push(new ElasticLink(this.points[(rows - 1) * cols + (cols - 1)], this.points[Math.floor(rows / 2) * cols + (cols - 1)], dy * Math.floor(rows / 2), this.restitution));
        }

        this.middleRightPoint = this.draggablePoints[1];
    }
    
    

    update(dt) {
        this.points.forEach(point => point.update(dt));

        for (let i = 0; i < CONSTRAINT_ITERATIONS; i++) {
            this.links.forEach(link => link.update());
        }

        this.points.forEach(point => point.constrain());
    }

    render() {
        this.links.forEach(link => link.render());
        this.points.forEach(point => point.render());
    }

    handleMousePress(mouseX, mouseY) {
        for (const point of this.draggablePoints) {
            if (distance(point, { x: mouseX, y: mouseY }) < point.radius) {
                point.isDragged = true;
                point.color = color(0, 255, 0);
                break;
            }
        }
    }

    handleMouseRelease() {
        this.draggablePoints.forEach(point => {
            point.isDragged = false;

        });
        this.points.forEach(point => point.color = color(255, 100));
    }

    handleMouseDrag(mouseX, mouseY) {
        const draggedPoint = this.draggablePoints.find(point => point.isDragged);
        if (draggedPoint) {
            if (draggedPoint === this.draggablePoints[0]) {
                draggedPoint.x = mouseX;
                draggedPoint.y = mouseY;
                draggedPoint.old_x = mouseX;
                draggedPoint.old_y = mouseY;
            } else if (draggedPoint === this.middleRightPoint) {
                const dx = mouseX - draggedPoint.x;
                const dy = mouseY - draggedPoint.y;
                this.applyUniformRightSidePull(dx, dy);
            }
        }
    }
    
    applyUniformRightSidePull(dx, dy) {
        const rightCol = this.cols - 1;
        
        console.log(dx)

    
        const topPoint = this.points[0 * this.cols + rightCol];
        const middlePoint = this.points[Math.floor(this.rows / 2) * this.cols + rightCol];
        const bottomPoint = this.points[(this.rows - 1) * this.cols + rightCol];

        [topPoint, middlePoint, bottomPoint].forEach(point => {
            point.color = color(0, 255, 0);
            point.y += dy
            point.old_y += dy;
            point.x += dx
            point.old_x += dx
        });

        
        topPoint.x = middlePoint.x;
        topPoint.old_x = middlePoint.old_x;
        bottomPoint.x = middlePoint.x;
        bottomPoint.old_x = middlePoint.old_x;

        console.log(topPoint.x, middlePoint.x, bottomPoint.x)
    }
    
    
    
}
// Global variables
let softBodies = [];

function setup() {
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT + 100);
    softBodies.push(new SoftBody(100, SCREEN_HEIGHT - 200, 200, 100, 3, 7, 0.3));
}

function draw() {
    background(0);

    const dt = deltaTime / 1000;

    softBodies.forEach(softBody => {
        softBody.update(dt);
        softBody.render();
    });
}

function mousePressed() {
    softBodies.forEach(softBody => softBody.handleMousePress(mouseX, mouseY));
}

function mouseReleased() {
    softBodies.forEach(softBody => softBody.handleMouseRelease());
}

function mouseDragged() {
    softBodies.forEach(softBody => softBody.handleMouseDrag(mouseX, mouseY));
}