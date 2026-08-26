void main() {
	gl_Position = projectionMatrix * modelViewMatrix * position;
}