class IdentificationGenerator {
  constructor() {
    this.id = this.idMaker();
  }

  idMaker() {
    let index = 0;
    return {
      next: function() {
        return {
          value: index++,
          done: false
        }
      }
    };
  }

  generateId() {
    return this.id.next().value;
  }
}

const idGen = new IdentificationGenerator();
export default idGen;