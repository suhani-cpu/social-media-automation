# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - button "Toggle theme" [ref=e4] [cursor=pointer]:
      - img [ref=e5]
      - generic [ref=e11]: Toggle theme
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e15]:
          - img [ref=e16]
          - img [ref=e19]
          - img [ref=e21]
        - generic [ref=e23]:
          - img [ref=e25]
          - heading "Stage OTT" [level=1] [ref=e27]
          - paragraph [ref=e28]: Social Media Automation Platform 🎬
      - generic [ref=e29]:
        - heading "Welcome Back" [level=3] [ref=e30]
        - paragraph [ref=e31]: Login to manage your content
      - generic [ref=e33]:
        - generic [ref=e34]:
          - text: Email
          - textbox "Email" [ref=e35]:
            - /placeholder: you@example.com
        - generic [ref=e36]:
          - text: Password
          - textbox "Password" [ref=e37]:
            - /placeholder: ••••••••
        - button "Login" [ref=e38] [cursor=pointer]
        - paragraph [ref=e39]:
          - text: Don't have an account?
          - link "Register" [ref=e40] [cursor=pointer]:
            - /url: /register
  - alert [ref=e41]
```