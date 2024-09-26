const value = 5;

const double = (num) => {
  return new Promise((resolve) => {
    resolve(num * 2);
  });
};

const addTen = (num) => {
  return new Promise((resolve) => {
    resolve(num + 10);
  });
};

double(value)
  .then(addTen)
  .then((result) => {
    console.log(result);
  });
