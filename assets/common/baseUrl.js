import {Platform} from 'react-native';

let baseURL = '';

{Platform.OS == 'android'
    ? baseURL = 'http://192.168.127.108:5000'
    : baseURL = 'http://localhost:3000'
}

export default baseURL;