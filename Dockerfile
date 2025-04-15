FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# copy application files
COPY index.html .
COPY main.js .
COPY assets/ ./assets/
COPY data/ ./data/

# explose port 80
EXPOSE 80

# start nginx server
CMD [ "nginx", "-g", "daemon off;"]