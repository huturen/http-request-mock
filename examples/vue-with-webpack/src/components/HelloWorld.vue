<template>
  <div class="hello">
  <div>
    Current Mock Status:
    &nbsp;&nbsp;
    <strong :class="{green: status, red: !status}">{{ status ? 'Enabled' : 'Disabled' }}</strong>
    &nbsp;&nbsp;
    <button @click="switchMockFunction">{{ status ? 'Disable it' : 'Enable it' }}</button>
  </div>

  <div class="request">
    <button @click="fetchRequest">Request By Fetch</button>
    <div class="input">
      URL: <input class="input" type="text" :value="url + '?t=fetch'" readonly />
    </div>
    <pre class="result">{{resultOfFetch}}</pre>
  </div>


  <div class="request">
    <button @click="xhrRequest">Request By XMLHttpRequest</button>
    <div class="input">
      URL: <input class="input" type="text" :value="url + '?t=xhr'" readonly />
    </div>
    <pre class="result">{{resultOfXhr}}</pre>
  </div>
  <div>Hit F12 to access Developer Tools and view the console logs.</div>
  </div>
</template>

<script>
import axios from 'axios';
import HttpRequetMock from 'http-request-mock';
export default {
  name: 'HelloWorld',

  data() {
    return {
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      status: true,
      resultOfFetch: '',
      resultOfXhr: '',
    }
  },

  mounted () {
    this.status = true;
    HttpRequetMock.enable();
  },

  methods: {
    switchMockFunction() {
      if (this.status === false) {
        HttpRequetMock.enable();
        this.status = !this.status;
      } else {
        HttpRequetMock.disable();
        this.status = !this.status;
      }
    },

    fetchRequest() {
      fetch(this.url + '?t=fetch').then(res => {
        console.log('fetch result:', res);
        res.json().then((json) => {
          this.resultOfFetch = json;
        });
      }).catch(err => {
        console.log('error:', err);
        this.resultOfFetch = err.message;
      });
    },

    xhrRequest() {
      axios.get(this.url + '?t=xhr').then(res => {
        console.log('xhr result:', res);
        this.resultOfXhr = res.data;
      }).catch(err => {
        console.log('error:', err);
        this.resultOfXhr = err.message;
      });
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.request {
  margin: 30px;
  border: 1px dashed black;
  width: 50%;
  margin: 0 auto;
  min-width: 750px;
}
.red {
  color: red;
}
.green {
  color: green;
}
.input input{
  width: 90%;
}
.result {
  border: 1px solid red;
  min-height: 100px;
  text-align: left;
}
</style>
