module.exports = {
  schemas: {
    auths: {
      type: 'object',
      properties: {
        role: {type: 'string'},
        email: {type: 'string'},
        imported: {
          type: 'object',
          properties: {
            id: {type: 'number'}
          }
        }
      }
    },
    games: {
      type: 'object',
      properties: {
        platform: {
          type: 'object',
          properties: {
            browser: {
              type: 'object',
              properties: {
                name: {type: 'string'},
                version: {type: 'string'},
                engine: {type: 'string'}
              }
            },
            os: {
              type: 'object',
              properties: {
                name: {type: 'string'},
                version: {type: 'string'}
              }
            },
            device: {
              type: 'object',
              properties: {
                name: {type: 'string'},
                manufacturer: {type: 'string'}
              }
            }
          }
        },
        dimensions: {
          type: 'object',
          properties: {
            screen: {
              type: 'object',
              properties: {
                width: {type: 'integer'},
                height: {type: 'integer'}
              },
              require: ['width', 'height']
            },
            window: {
              type: 'object',
              properties: {
                width: {type: 'integer'},
                height: {type: 'integer'}
              },
              required: ['width', 'height']
            }
          },
          required: ['screen', 'window']
        },
        events: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              type: {type: 'string'},
              start: {type: 'number'},
              duration: {type: 'number'},
              finished: {type: 'boolean'},
              data: {type: 'object', additionalProperties: true}
            },
            required: ['type', 'start', 'data']
          }
        },
        missingFeatures: {
          type: ['boolean', 'array'],
          items: {type: 'string'}
        },
        imported: {type: 'object', additionalProperties: true},
        user: {type: 'string'},
        ua: {type: 'string'},
        devicePixelRatio: {type: 'number'},
        browserLocale: {type: 'string'},
        gameLocale: {type: 'string'},
        entryHash: {type: 'string'},
        domain: {type: 'string'},
        finished: {type: 'boolean'},
        start: {type: 'number'},
        duration: {type: 'number'}
      },
      required: ['user', 'ua', 'dimensions', 'devicePixelRatio', 'browserLocale', 'gameLocale',
        'entryHash', 'domain', 'start', 'duration', 'missingFeatures', 'platform']
    },
    aggregate: {
      type: 'object',
      properties: {
        session: {type: 'integer'},
        kitten: {type: 'integer'},
        death: {type: 'integer'},
        edit: {type: 'integer'},
        level: {type: 'integer'},
        cutscene: {type: 'integer'},
        skip: {type: 'integer'},
        action: {type: 'integer'},
        incompatible: {type: 'integer'},
        finish: {type: 'integer'},
        page: {type: 'integer'},
        t: {type: 'integer'},
        interval: {type: 'string'}
      },
      required: ['session', 'kitten', 'death', 'edit', 'level', 'cutscene', 'skip', 'action', 'incompatible',
        'finish', 't', 'interval', 'page']
    }
  }
};
