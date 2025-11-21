class GameApplication {


  async Init() {

    //await shaders.loadShaders();
    this.Initialize_();

  }



}

let _APP = null;
window.addEventListener( 'DOMContentLoaded', async() => {

  _APP = new GameApplication();
  await _APP.init();


} );
const a = 0;
