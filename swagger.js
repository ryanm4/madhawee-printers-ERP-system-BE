const swaggerJSDoc = require('swagger-jsdoc');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "API",
            version: "1.0.0",
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? `${process.env.PROD_URL}/api/v1`   // ✅ uses env variable
                    : "http://localhost:3000/api/v1",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./routes/*.js", "./routes/**/*.js"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
module.exports = swaggerSpec;