import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import mercurius, { IResolvers, MercuriusLoaders } from 'mercurius'
import mercuriusCodegen from 'mercurius-codegen'

import { loadFilesSync } from '@graphql-tools/load-files'

const schema = loadFilesSync('src/graphql/schema/**/*.gql', {}).map(String)

export const app = Fastify()

const buildContext = async (req: FastifyRequest, _reply: FastifyReply) => {
  return {
    authorization: req.headers.authorization,
  }
}

type PromiseType<T> = T extends PromiseLike<infer U> ? U : T

declare module 'mercurius' {
  interface MercuriusContext
    extends PromiseType<ReturnType<typeof buildContext>> {}
}

const dogs = [
  { name: 'Max' },
  { name: 'Charlie' },
  { name: 'Buddy' },
  { name: 'Max' },
]

const owners: Record<string, { name: string }> = {
  Max: {
    name: 'Jennifer',
  },
  Charlie: {
    name: 'Sarah',
  },
  Buddy: {
    name: 'Tracy',
  },
}

const NOTIFICATION = 'notification'

const resolvers: IResolvers = {
  Query: {
    Hello(_root, _args, _ctx, _info) {
      return 'world'
    },
    dogs() {
      return dogs
    },
  },
  Mutation: {
    add(_root, { x, y }, _ctx, _info) {
      return x + y
    },
    createNotification(_root, { message }, { pubsub }) {
      pubsub.publish({
        topic: NOTIFICATION,
        payload: {
          newNotification: message,
        },
      })
      return true
    },
  },
  Subscription: {
    newNotification: {
      subscribe: (_root, _args, { pubsub }) => {
        return pubsub.subscribe(NOTIFICATION)
      },
    },
  },
}

const loaders: MercuriusLoaders = {
  Dog: {
    async owner(queries, _ctx) {
      return queries.map(({ obj }) => owners[obj.name])
    },
  },
}

app.register(mercurius, {
  schema,
  resolvers,
  loaders,
  context: buildContext,
  subscription: true,
})

mercuriusCodegen(app, {
  targetPath: './src/graphql/generated.ts',
  operationsGlob: './src/graphql/operations/*.gql',
})

// app.listen(8000)
