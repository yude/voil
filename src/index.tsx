import { Hono } from 'hono'
import { html } from 'hono/html'
import { jsx } from 'hono/jsx'
import { KVNamespace } from '@cloudflare/workers-types'
import { env } from 'hono/adapter'

type Bindings = {
  voil: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

const Layout = (props: { children?: any }) => html
  `<!doctype html>
  <html lang="ja">
    <head>
      <meta charset="utf-8">
      <title>voil</title>
    </head>
    <body>
      <h1>voil</h1>
      ${props.children}
    </body>
  </html>`

type Article = {
  body: string;
}

app.get('/', async (c) => {
  const articles = await c.env.voil.list()

  return c.html(
    <Layout>
      <h2>
        Menu
      </h2>
      <ul>
        <li><a href="/new">Add a new page</a></li>
      </ul>
      <h2>
        Articles
      </h2>
      Click to edit existing page.
      <ul>
        {
          articles.keys.map((article) => (
            <li><a href={"/edit/" + article.name.replace("article:", "")}>{article.name.replace("article:", "")}</a></li>
          ))
        }
      </ul>
    </Layout>
  )
})

app.get('/new', async (c) => {

  return c.html(
    <Layout>
      <h2>Add a new page</h2>
      <p><a href="/">Return to top</a></p>
      <div>
        <h3>Title</h3>
        <input type="text" id="title" name="title" required minlength={1} size={60} />
      </div>
      <div>
        <h3>Body</h3>
        <textarea id="body" name="body" placeholder='Enter body' rows={10} cols={70}></textarea>
      </div>
      <input type="button" value="Submit" onClick="submit()" />
      {html`
      <script>
        function submit() {
          let title = document.getElementById("title").value;
          let body = document.getElementById("body").value;
          fetch("/api/article/" + title + "/" + body, {
            method: "POST"
          })
        }
      </script>
      `}
    </Layout>
  )
})

app.get('/edit/:name', async (c) => {
  const { name } = c.req.param()

  try {
    const article_json = await c.env.voil.get("article:" + name)

    if (article_json === null) {
      return c.html(
        <Layout>
          <h2>Editing {name}</h2>
          <p><a href="/">Return to top</a></p>
          <p>Article {name} does not exist. How about <a href="/new">creating a new one?</a></p>
        </Layout>
      )
    }

    const article: Article = JSON.parse(article_json)

    return c.html(
      <Layout>
        <h2>Editing {name}</h2>
        <div>
          <span style="margin: 5px;"><a href="/">Return to top</a></span>
          <span style="margin: 5px;"><a href={"/delete/" + name}>Delete this page</a></span>
        </div>
        <textarea id="body" name="body" style="margin-top: 20px;" rows={10} cols={70}>
          {article.body}
        </textarea>
      </Layout >
    )
  }
  catch (e) {
    <Layout>
      <h2>Editing {name}</h2>
      <p><a href="/">Return to top</a></p>
      <p>Error occured while reading this page.</p>
    </Layout>
  }
})

app.get('/delete/:title', async (c) => {
  const { title } = c.req.param()

  try {
    const article_json = await c.env.voil.get("article:" + title)

    if (article_json === null) {
      return c.html(
        <Layout>
          <h2>Deleting {title}</h2>
          <p><a href="/">Return to top</a></p>
          <p>Article {title} does not exist.</p>
        </Layout>
      )
    }

    return c.html(
      <Layout>
        <h2>Deleting <span id="title">{title}</span></h2>
        <p><a href="/">Return to top</a></p>
        <h3>Are you sure want to delete this page?</h3>
        <input type="button" value="Yes" onClick="del();" style="font-size: 600%; padding: 50px" />
        {html`
          <script>
            function del() {
              let title = document.getElementById("title").innerHTML;
              fetch("/api/article/" + title, {
                method: "DELETE"
              }).then(() => {
                window.location.href = "/";
              })
            }
          </script>
      `}
      </Layout >
    )
  }
  catch (e) {
    <Layout>
      <h2>Deleting {title}</h2>
      <p><a href="/">Return to top</a></p>
      <p>Error occured while reading this page.</p>
    </Layout>
  }
})

app.post('/api/article/:title/:body', async (c) => {
  const { title } = c.req.param()
  const { body } = c.req.param()

  const article: Article = {
    body: body,
  }

  await c.env.voil.put("article:" + title, JSON.stringify(article))
  return c.json({ success: true })
})

app.delete('/api/article/:key', async (c) => {
  const { key } = c.req.param()
  await c.env.voil.delete("article:" + key)
  return c.json({ success: true })
})

app.get('/api/articles', async (c) => {
  const articles = await c.env.voil.list()

  return c.json({ success: true, articles: articles.keys.map((article) => (article.name.replace("article:", ""))) })
})

app.fire()


export default app
