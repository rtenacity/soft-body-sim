const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight - 100;

let force_x = 10;
let force_y = 600; // Gravity
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

      let acc_x = force_x / this.mass;
      let acc_y = force_y / this.mass;

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
      this.y = this.y + vel_y * damp_constant;
    }
  }

  render() {
    noStroke();
    fill(255, 100);
    circle(this.x, this.y, this.radius * 2);
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
    let percent = (diff / dist) / 2;
    
    let offset_x = dx * percent;
    let offset_y = dy * percent;
    
    if (!this.p0.pinned) {
      this.p0.x -= offset_x;
      this.p0.y -= offset_y;
    }
    
    if (!this.p1.pinned) {
      this.p1.x += offset_x;
      this.p1.y += offset_y;
    }
  }

  render() {
    stroke(200, 100);
    line(this.p0.x, this.p0.y, this.p1.x, this.p1.y);
  }
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
  
  update(dt) {
    for (let point of this.points) {
      point.update(dt);
    }
    
    for (let i = 0; i < 5; i++) {
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

let softBody;

function setup() {
  createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT+100);
  softBody = new SoftBody(100, 300, 200, 100, 4, 8); // x, y, width, height, rows, cols
}

function draw() {
  background(0);
  
  let dt = deltaTime / 1000;
  softBody.update(dt);
  softBody.render();
}