---
title: Virtual Memory & Paging
subtitle: Address Translation, Page Faults, and Page Replacement Algorithms
date: 2026-10-06
description: Address Translation, Page Faults, and Page Replacement Algorithms
section: Memory
tags:
  - operating-systems
  - memory
  - interactive
draft: false
cover: /articles/virtual-memory-and-paging/Screenshot%202026-10-09%20at%203.27.01%20AM.png
---

<figure>
  <img src="/articles/virtual-memory-and-paging/Screenshot%202026-10-09%20at%203.27.01%20AM.png" alt="Laptop RAM" />
  <figcaption>Image from <a href="https://www.makeuseof.com/tag/upgrading-a-laptops-ram-step-by-step-si-x2/">here</a></figcaption>
</figure>


In all computers, programs execute instructions from the central processing unit (CPU), and executing those instructions requires parsing and modifying a memory address. This very reading and writing to the memory address, therefore, begs us to question:

> “Where does that address actually lead?”

In contemporary computing, the obvious abstraction is that user-level interaction — where many of the applications we use are designated as programs — obfuscates the underlying physicalities of the working computer system. However, this abstraction is also essential for any operating system (OS) to run multiple processes: hundreds of active processes could share a limited system memory supply seamlessly. Without this abstraction, our software programs would crash into one another within their respective memory spaces, undermining performance and creating critical vulnerabilities.

Therefore, to achieve this abstraction, an operating system provides distinct representations of memory structure. For example:

- **Virtual (Logical) memory** is an abstraction provided by an OS and hardware system that gives a process within a computer a sort of “illusion” of possessing its own memory address space, letting it be completely independent of other applications. In the background of this, the physical main memory — somewhere in, like, random access memory (RAM) — is shared among the other multiple processes that could be running.

    - Then, the CPU creates a **virtual (logical) memory address**; the “illusion” a process can “see.”

        - Finally, through dynamic translation of the process’s virtual memory address, it produces a **physical memory address**, its final representation, which identifies the actual location in physical RAM.

The procedure above solves the systemic flaws of directly exposing physical memory addresses to user applications. In creating the “illusion” that alters a process’s fundamental perspective on memory, it allows the abstraction an OS needs to keep the user-kernel hierarchy intact, enables **non-contiguous memory allocation** (a process doesn't have its components and pieces clumped into a single unbroken block but rather can be scattered across RAM itself), and allows hardware-enforced policies and process isolation, when needed.

In a silly way, you could think that giving a process direct exposure to the physical memory space, rather than the “illusion,” would be infohazourdous to our small process guy, in that our small guy could irresponsibly overwrite critical kernel data and, due to the temporal nature of his creation, expansion, and termination, could create fragmentation in the physical RAM.

The procedure above has more depth than meets the eye; suggesting the need for abstraction and separation is intuitive. If we truly want to let a process’s virtual view of its own world apply to the material reality of the hardware, how do we make sure this quasi-sim2real gap is not badly discrepant?

## Dividing Memory to Solve Fragmentation

Early memory management systems allocated continuous, or contiguous, physical memory in individual partitions, achieved via fixed-size partitions, unequal-sized partitions, or dynamic variable-sized allocation. It all came with its own engineering trade-offs; variable-sizing was good at avoiding memory waste inside partitions (**internal fragmentation**), but — as mentioned in the previous section, bad things happening to RAM — it was prone to **external fragmentation**, in that the physical memory in this case would be chopped into scattered tiny holes all over the memory space. These small holes literally could not satisfy new process requests, even when total free memory was abundant.

This external fragmentation was genuinely a real problem, so much so that system designers investigated two unique approaches to this:

1. In the **compaction** approach, occupied memory partitions are physically copied and joined together. Those small holes within free memory space — the by-product of external fragmentation — would then be combined into a single contiguous block of memory. However, repeatedly copying entire process memory spaces across RAM is extremely computationally costly; immense CPU time and poor scaling could not support the multitasking demands of contemporary computing.

2. With the abandonment of contiguous partition requirements, the core non-contiguous allocation approach is **paging**: both physical main memory and virtual address spaces would be divided into fixed, equal-sized blocks.

Within the paging paradigm, memory terminology is strictly defined as follows:

- **Pages:**

    - *These are fixed-size chunks into which a process’s virtual (logical) address space is divided (ex., numbered $0$, $1$, $2$, …).*

- **Frames (Page Frames):**

    - *These are also fixed-size — like pages — but represent slots in physical main memory equal in size to virtual pages (ex., $4\text{ KB}$ or $8\text{ KB}$, always in powers of two).*

- **Page Table:**

    - *A data structure that is instantiated per process, managed by the OS and the memory management unit (MMU). A page table maps each virtual page of a process to its corresponding physical frame within the physical memory.*

<iframe data-paging="mapping" src="/visualizations/paging/mapping" title="Interactive walkthrough: virtual pages map to physical frames" width="100%" height="960" loading="lazy"></iframe>

With memory structured in this discrete page-frame way, we still need to know exactly where — at the bit level within a computer system — the memory’s location is. This is where we start to understand that the encoding and subsequent address translation, which represent memory location, play a role.

## Reading a Memory Address

Computer systems rely, fundamentally, on a different base system of counting numbers when they read, write, store, and make decisions on information: the **binary representations** of numbers ($0$s and $1$s, base-2). So when it comes to the address translation mechanism — our subsequent method of reading the memory addresses instantiated by the process — it requires structured representations. This means that when the OS and hardware systems declare the sizes and amount of virtual memory space allowed, they are all in strict powers of two, representative, of course, of base-2 binary. As an example to walk through:

> **Notation:** I use $\mathcal{B}$ and $\mathcal{KB}$ for numerical sizes in bytes and binary kilobytes, and $b$ for a bit count. Here, $1\text{ KB}=1024\text{ bytes}$ follows the course convention (see references); the standardized name for this unit is the [kibibyte (KiB)](https://physics.nist.gov/cuu/Units/binary.html). Storage bits count data capacity; address bits count the bits needed to select a location.

- We will let a **bit** represent the smallest unit of digital information, which can have one of two values: $0$ and $1$.

    - If we let $b$ be the number of bits, and each bit possesses only two possible states, we can represent this relationship combinatorially as $2^b$:

        $$
        1\text{ bit}\rightarrow2^1=2\text{ combinations}
        $$

        $$
        2\text{ bits}\rightarrow2^2=4\text{ combinations}
        $$

        $$
        3\text{ bits}\rightarrow2^3=8\text{ combinations}
        $$

        $$
        8\text{ bits}\rightarrow2^8=256\text{ combinations}
        $$

    - Therefore, $b$ bits can represent $2^b$ distinct values or states.

        - This can be visualized in an example: Given an $8$-bit binary value, we can determine it has $2^8 = 256$ bit patterns, starting from:

            $$
            \texttt{00000000}
            $$

            through

            $$
            \texttt{11111111}
            $$

            - Assuming that we interpret this as an unsigned integer, $\texttt{00000000}$ and $\texttt{11111111}$ correspond to the base-10 numbers $0$ through $255$. Thus, including $0$, there are still $256$ possible values, aligning with our $2^8 = 256$ formulation.

- Then, we will let a **byte** represent a grouping of $8$ bits. This means that, given a byte, the number of possible bit patterns can be denoted as:

    $$
    \begin{aligned} 1\text{ byte} &= 8\text{ bits} \\
    2^8 &= 256\text{ bit patterns}
    \end{aligned}
    $$

    - As an example:

        $$
        2\text{ bytes} = 16\text{ bits}
        $$

        $$
        4\text{ bytes} = 32\text{ bits}
        $$

    - So if we let $\mathcal{B}$ be the number of bytes, and let $b$ be the number of bits, we could notate the generalized form as:

        $$
        b = 8\mathcal{B} = 2^3\mathcal{B}
        $$

- Now that we know the bits-to-bytes relationship, we can scale the size in relation to bytes. If we go to the scale of **kilobytes**, the conversion is represented as:

    <div class="responsive-equation">

    <div class="equation-wide">

    $$
    1\text{ KB}=1024\text{ bytes}=2^{10}\text{ bytes}
    $$

    </div>

    <div class="equation-compact">

    $$
    \begin{aligned} 1\text{ KB} &=1024\text{ bytes} \\
    &=2^{10}\text{ bytes}
    \end{aligned}
    $$

    </div>

    </div>

    - So let's say we have $4$ kilobytes; we can formulate the conversion as:

        <div class="responsive-equation">

        <div class="equation-wide">

        $$
        \begin{aligned}4\text{ KB} &=4\times1024\text{ bytes} =2^2\times2^{10}\text{ bytes} \\ &=2^{12}\text{ bytes} =4096\text{ bytes}\end{aligned}
        $$

        </div>

        <div class="equation-compact">

        $$
        \begin{aligned} 4\text{ KB} &= 4\times1024\text{ bytes} \\
        &= 2^2\times2^{10}\text{ bytes} \\
        &= 2^{12}\text{ bytes} \\
        &= 4096\text{ bytes}
        \end{aligned}
        $$

        </div>

        </div>

    - And since every byte can also be represented as $8 = 2^3$ bits, the kilobytes-to-bits conversion can be represented as:

        <div class="responsive-equation">

        <div class="equation-wide">

        $$
        4\text{ KB}=2^{12}\text{ bytes}=2^{15}\text{ bits}=32{,}768\text{ bits}
        $$

        </div>

        <div class="equation-compact">

        $$
        \begin{aligned} 4\text{ KB} &= 2^{12}\text{ bytes} \\
        &= 2^{12}\times2^3\text{ bits} \\
        &= 2^{15}\text{ bits} \\
        &= 32{,}768\text{ bits}
        \end{aligned}
        $$

        </div>

        </div>

    - Therefore, if we let $\mathcal{KB}$, $\mathcal{B}$, and $b$ represent kilobytes, bytes, and bits, respectively, then we can construct generalized forms:

        - Kilobyte-to-byte and kilobyte-to-bits:

            $$
            \mathcal{B} = 2^{10}\mathcal{KB}
            $$

            Since $b = 8\mathcal{B} = 2^3\mathcal{B}$:

            $$
            b = 2^3(2^{10}\mathcal{KB})
            $$

            Therefore:

            $$
            b = 2^{13}\mathcal{KB}
            $$

        - Byte-to-kilobyte and Bit-to-kilobyte:

            $$
            \mathcal{KB} = \frac{\mathcal{B}}{2^{10}}
            $$

            Since $b = 8\mathcal{B} = 2^3\mathcal{B}$:

            $$
            \mathcal{B} = \frac{b}{2^3}
            $$

            Therefore:

            $$
            \mathcal{KB} = \frac{\frac{b}{2^3}}{2^{10}}
            $$

            $$
            \mathcal{KB} = \frac{b}{2^{13}}
            $$

- In memory addressing contexts, $b$ address bits can identify $2^b$ memory locations. If we were given $12$ address bits, then the number of address locations in memory can be found as follows:

    $$
    2^{12} = 4096\text{ possible addresses}
    $$

    - With the same number of address bits given above, if you can represent the memory in a **byte-addressable** way, then each address selects one byte:

        <div class="responsive-equation">

        <div class="equation-wide">

        $$
        2^{12}\text{ addresses}\times1\frac{\text{byte}}{\text{address}}=2^{12}\text{ bytes}=4\text{ KB}
        $$

        </div>

        <div class="equation-compact">

        $$
        \begin{aligned} &2^{12}\text{ addresses} \\
        &\quad\times1\frac{\text{byte}}{\text{address}} \\
        &=2^{12}\text{ bytes} \\
        &=4\text{ KB}
        \end{aligned}
        $$

        </div>

        </div>

        Thus, we can find the number of **offset bits** given the page/frame size (mentioned in the previous section) by looking at the exponent representing byte memory location. In our $4\text{ KB}$ example, therefore:

        <div class="responsive-equation">

        <div class="equation-wide">

        $$
        4\text{ KB page}  \Longleftrightarrow 
        2^{12}\text{ byte locations}  \Longleftrightarrow 
        12\text{ offset bits}
        $$

        </div>

        <div class="equation-compact">

        $$
        \begin{gathered} 4\text{ KB page} \\
        \Updownarrow \\
        2^{12}\text{ byte locations} \\
        \Updownarrow \\
        12\text{ offset bits}
        \end{gathered}
        $$

        </div>

        </div>

        For a generalizable formulation of this conversion, let $\mathcal{P}_{\mathcal{B}}$ be the page/frame size in bytes and $d_{b}$ be the number of offset bits. As such, the relationship here can be shown as:

        $$
        \mathcal{P}_{\mathcal{B}} = 2^{d_{b}}
        $$

        and:

        $$
        d_{b}=\log_2(\mathcal{P}_{\mathcal{B}})
        $$

        Therefore:

        <div class="responsive-equation">

        <div class="equation-wide">

        $$
        2^{d_b}\text{ byte page}  \Longleftrightarrow 
        2^{d_b}\text{ byte locations}  \Longleftrightarrow 
        d_b\text{ offset bits}
        $$

        </div>

        <div class="equation-compact">

        $$
        \begin{gathered} 2^{d_b}\text{ byte page} \\
        \Updownarrow \\
        2^{d_b}\text{ byte locations} \\
        \Updownarrow \\
        d_b\text{ offset bits}
        \end{gathered}
        $$

        </div>

        </div>

        To scale to kilobytes, we will let $\mathcal{P}_{\mathcal{KB}}$ be the page/frame size in kilobytes. To represent the exponent of the page/frame size with respect to kilobytes, we’ll let $e_{\mathcal{KB}}$ be derived as follows:

        $$
        e_{\mathcal{KB}} = \log_2(\mathcal{P}_{\mathcal{KB}})
        $$

        For these power-of-two page sizes, $e_{\mathcal{KB}}$ is an integer. So, to obtain the page/frame size in kilobytes:

        $$
        \mathcal{P}_{\mathcal{KB}} = 2^{e_{\mathcal{KB}}}
        $$

        Then, when we want to convert down to page/frame size in bytes:

        $$
        \mathcal{P}_{\mathcal{B}} = 2^{10}\mathcal{P}_{\mathcal{KB}}
        $$

        Substituting $2^{e_{\mathcal{KB}}}$ for $\mathcal{P}_{\mathcal{KB}}$ yields:

        $$
        \mathcal{P}_{\mathcal{B}} = 2^{10}(2^{e_{\mathcal{KB}}})
        $$

        Add the exponents, and we get the kilobyte-to-byte page/frame size conversion representation as:

        $$
        \mathcal{P}_{\mathcal{B}} = 2^{e_{\mathcal{KB}}+10}
        $$

        Recall that our offset bits were represented as $d_{b}=\log_2(\mathcal{P}_{\mathcal{B}})$ when we were dealing with page/frame sizes in bytes. If, by looking at the exponent value, we can get our offset bits value, this means that for kilobyte page/frame sizes, our offset bits representation can be replaced to match what is contained in the exponent in $2^{e_{\mathcal{KB}}+10}$, such that:

        $$
        d_{b} = e_{\mathcal{KB}}+10
        $$

        Therefore:

        <div class="responsive-equation">

        <div class="equation-wide">

        $$
        2^{e_{\mathcal{KB}}}\text{ KB page}  \Longleftrightarrow 
        2^{e_{\mathcal{KB}}+10}\text{ byte locations}  \Longleftrightarrow 
        (e_{\mathcal{KB}}+10)\text{ offset bits}
        $$

        </div>

        <div class="equation-compact">

        $$
        \begin{gathered} 2^{e_{\mathcal{KB}}}\text{ KB page} \\
        \Updownarrow \\
        2^{e_{\mathcal{KB}}+10}\text{ byte locations} \\
        \Updownarrow \\
        (e_{\mathcal{KB}}+10)\text{ offset bits}
        \end{gathered}
        $$

        </div>

        </div>

What is this all useful for, you may ask? **Address splitting** — the MMU dividing (making slices in its bits) an address string directly into a **page number** and a **relative memory location** — eliminates computationally expensive arithmetic division or modulus calculations. So, if we really want to be able to read, interpret, and split these memory addresses without being thrown a ton of $0$s and $1$s, an incredibly compact way in which many visualizations and pedagogical resources (and thereby many of the systems designed in computers, as a by-product) depict these addresses is in a base-16, hexadecimal representation of a counting system.

A quick crash course on hexadecimal, so I don’t use jargon notationally:

- Memory addresses operate in binary representations based on physical hardware fundamentals and can be represented more compactly; the hexadecimal system is a base-16 counting system, such that:

    $$
    0,1,2,\ldots,9, A, B, C, D, E, F
    $$

    Where

    <div class="responsive-equation">

    <div class="equation-wide">

    $$
    A=10,\quad B=11,\quad C=12,\quad D=13,\quad E=14,\quad F=15
    $$

    </div>

    <div class="equation-compact">

    $$
    \begin{aligned} A&=10 & B&=11 \\
    C&=12 & D&=13 \\
    E&=14 & F&=15
    \end{aligned}
    $$

    </div>

    </div>

- Given this, we can determine that the hexadecimal counting system has $16 = 2^4$ possible values per digit. This means that:

    $$
    1\text{ hexadecimal digit} = 4\text{ bits}
    $$

    - As an example, with the subscript number representing the base of the number’s counting system:

        $$
        (1010)_2=(A)_{16}=(10)_{10}
        $$

        $$
        (1101)_2=(D)_{16}=(13)_{10}
        $$

        $$
        (1111)_2=(F)_{16}=(15)_{10}
        $$

- Therefore, if we let $\mathcal{H}$ represent the number of hexadecimal digits and $b$ represent the number of bits, we can denote this as:

    $$
    b = 4\mathcal{H}
    $$

    And, conversely, for a bit width divisible by $4$, as:

    $$
    \mathcal{H} = \frac{b}{4}
    $$

- In the context of paging, let $d_{b}$ be the number of offset bits and $d_{\mathcal{H}}$ be the number of hexadecimal digits the offset occupies. When $d_{b}$ is divisible by $4$, we can denote:

    $$
    d_{\mathcal{H}} = \frac{d_{b}}{4}
    $$

    - So, for example, if we take a $4\text { KB}$ page/frame size:

        <div class="responsive-equation">

        <div class="equation-wide">

        $$
        4\text{ KB}  \Longleftrightarrow 
        2^{12}\text{ byte locations}  \Longleftrightarrow 
        12\text{ offset bits}  \Longleftrightarrow 
        3\text{ offset hexadecimal digits}
        $$

        </div>

        <div class="equation-compact">

        $$
        \begin{gathered} 4\text{ KB} \\
        \Updownarrow \\
        2^{12}\text{ byte locations} \\
        \Updownarrow \\
        12\text{ offset bits} \\
        \Updownarrow \\
        3\text{ offset hexadecimal digits}
        \end{gathered}
        $$

        </div>

        </div>

    - Then, let's say we have a virtual memory address, written in hexadecimal, as:

        $$
        \texttt{0x12345ABC}
        $$

        If we have a $4\text{ KB}$ page/frame size, we can split this address in accordance with the number of offset bits — and by extension, offset hexadecimal digits — that $4\text{ KB}$ comes with ($12$ offset bits, or $3$ offset hexadecimal digits). Therefore:

        $$
        \texttt{0x12345}|\texttt{ABC}
        $$

        Where:

        $$
        \texttt{0x12345}=\text{virtual page number}
        $$

        And:

        $$
        \texttt{0xABC}=\text{page offset}
        $$

You can visualize this here (GPT-generated diagram, sourced from what I drew on paper, sorry):

![Logical Address Bit Breakdown Diagram](/articles/virtual-memory-and-paging/Logical%20Address%20Bit%20Breakdown%20Diagram.png)

Keep in mind that — intentionally — the bit boundary between the page number and offset is not aligned neatly with hexadecimal digit boundaries in this diagram. Here, we have a $16$-bit memory address with page size $8\text{ KB}$ (the offset is $13$ bits); the offset cross-cuts the second hexadecimal digit $\texttt{0x6}$ (or $0110$ in binary). This then leaves the top $3$ subsequent bits $100$ (or $\texttt{0x4}$ in hexadecimal) as the virtual page number.

Now that we have parsed and split the virtual memory address into its designated page number and offset, how is this address translated into the physical address in RAM it needs to target?

## Following a Memory Address into Physical Memory

Given the page-organization schemes mentioned above, a CPU requesting access to a virtual memory address — with a corresponding page in main physical memory — can execute the virtual-address-to-physical-memory translation seamlessly. This is because virtual pages and physical page frames are the same size, and the offset also possesses the same property. Therefore, translating a virtual address into a physical frame number requires only the high-order page number for the hardware to execute.

But storing page tables in physical memory creates a bottleneck: it creates a delay between a data (instructions, a program’s payload) request and its subsequent arrival; two physical memory lookups — one to read and retrieve a translation address from the page table and another to access and write the actual data in the target memory address — are going to create a doubled memory latency (a $2 \times$ slowdown penalty, specifically). To solve this, modern computing systems incorporate a high-speed hardware cache called the **translation lookaside buffer (TLB)**. TLBs have been quite successful; they cache frequently used page-to-frame mappings directly inside the MMU. Thus, in sub-nanosecond hardware cycles, address translations are resolved on a **TLB hit**, while a **TLB miss** requires falling back to the page tables stored in physical memory.

This process of address translation is executed by the hardware system in the following sequence:

1. Receive the address by reading the virtual hexadecimal or binary virtual memory address issued by the CPU

2. Based on a contiguous binary bit string from 1, calculate the offset width from a page size of $2^{d_b}$ bytes (ex. $8\text{ KB} = 2^{13}\text{ bytes}$ where $d_b = 13$)

3. Split the bit string into a high-order page number and low-order offset.

4. Perform a lookup on the page table by indexing the TLB using the page number to retrieve a physical frame number.

5. Reconstruct the address by combining the retrieved frame number with the unchanged offset, and padding the frame number with leading zeros (if the physical frame field width is given and requires it)

6. Convert the reconstructed binary string, ready for hardware bus access.

We can, therefore, formulate the notion of physical address translation in a way like this:

<div class="responsive-equation">

<div class="equation-wide">

$$
\text{Physical Address}=(\text{Frame Number}\times\text{Page Size})+\text{Offset}
$$

</div>

<div class="equation-compact">

$$
\begin{aligned} &\text{Physical Address} \\
&\quad=\text{Frame Number} \\
&\qquad\times\text{Page Size} \\
&\qquad+\text{Offset}
\end{aligned}
$$

</div>

</div>

<iframe data-paging="translation" src="/visualizations/paging/translation" title="Interactive walkthrough: hexadecimal virtual to physical address translation" width="100%" height="1200" loading="lazy"></iframe>

Requested pages in this mechanism are assumed to be already occupying RAM. So, if a program requests data not already in RAM, we need another paging mechanism, one that transforms notions of virtual memory as a whole. Previous understandings of paging upheld that an entire program must reside in physical RAM before execution. However, a program also does not use all its data, all of the time. This means we need a mechanism akin to a simple, economical data-for-program supply-and-demand system.

## True… Virtual Memory?

It is in the last section: yes, this is where we need **demand paging**. Demand paging loads virtual pages into physical memory on demand, allowing a program’s virtual address space to far exceed the host physical RAM capacity. An example of this would be a $64\text{ KB} = 2^{16}\text{ bytes}$ process executing on a $32\text{ KB} = 2^{15}\text{ bytes}$ physical memory system. Incredibly neat, this seems like true virtual memory now!

In order for this to maintain itself and essentially manage the “residency,” each **page table entry (PTE)** contains markers of status or control, represented by a bit:

- **Present/Absent bit:**

    - *Set the bit to $1$ if the page is currently a “resident” in physical RAM (present); otherwise set to $0$ if absent from physical RAM (absent)*

- **Protection bits:**

    - *Records access permissions (such as read-only, read-write, executable)*

- **Modified (dirty) bit:**

    - *Tracks whether the page has been written to since it was loaded.*

- **Reference bit:**

    - *Tracks whether the page has been accessed recently*

- **Caching-disabled bit:**

    - *Controls caching behavior for the hardware*

Before proceeding, understand that a page absent from physical RAM can still belong to a valid virtual address space mapping; the OS must check the mapping and access permissions before bringing it into RAM. So, what actually happens when our process requests one of these absent pages? 

The hardware raises a **page fault**, an OS-oriented control mechanism that takes a valid request requiring a page from backing storage — a Solid-State Drive (SSD) or hard drive — and processes it through the following sequence:

1. Validate the access as described above.
2. Locate the required page in its backing storage, and obtain a physical frame in which to place it.
3. Load the page into that frame. If obtaining the frame requires an eviction, handle the outgoing page first.
4. Update the page table with the new frame number and residency status, and update or invalidate affected TLB entries as needed.
5. Restart the instruction so that its memory access can now proceed.

Step 2 still leaves a decision unresolved, however: where does the incoming page go if no suitable frame is free?

## Resident Evicting

*"Which resident page should be evicted?"* the OS asks. We touched on memory address translation and fault handling: hardware translates addresses and raises page faults, while the OS handles those faults. However, when obtaining a frame requires evicting a resident page, the OS’s replacement policy selects who is to be evicted (we'll use the term *victim*, here) in order to fulfill step 2 from previous section. This OS policy is called a **page replacement**.

The **Modified (dirty) bit** introduced earlier now determines whether eviction requires a write-back. All content that is modified must be preserved in backing storage before the *victim*’s frame is overwritten. In accordance, a clean page with an up-to-date backing copy needs no write-back. Fault handling then continues with the loading and mapping updates described above.

However, evicting a page the program immediately requests causes another fault, again. If repeated paging dominates useful execution, the system is **thrashing**.

In the following visualizations, to make these decisions visible, we will use the same setup for all three replacement algorithms:

- **Page hit (H):** The requested page is already resident in one of the available frames.
- **Page fault (F):** The absent-page case described above. Loading into an empty frame also counts as a fault.
- **Physical Memory:** Three initially empty frames, numbered $0$, $1$, and $2$.
- **Reference String:** An example sequence of requested page numbers: `7, 0, 1, 2, 0, 3, 0, 4, 2, 3`.

### First-In, First-Out (FIFO)

A resident page that arrived first is the first to leave. Whoever comes first, they also go out first, too. We can represent this using an **arrival queue**, adding a newly loaded page at the back and removing the oldest page from the front. A hit *does not change this ordering*, even if that access suggests the page is still useful.

<iframe data-paging="fifo" src="/visualizations/paging/fifo" title="Interactive FIFO page replacement walkthrough" width="100%" height="850" loading="lazy"></iframe>

### Second Chance

An extension of FIFO, the **reference bit** — introduced earlier and denoted here by $R$ — marks to qualify the former algorithm's choice. Newly loaded pages enter with $R=0$, and a later hit sets $R=1$. This initialization convention is part of the example; other descriptions may account for the access that loads a page differently.

When a replacement is required, inspect the page at the front of the queue:

- If $R=0$, evict that page.
- If $R=1$, clear the bit to $0$, move its identifier to the back of the queue, and inspect the next candidate.

A circular implementation, commonly called **Clock**, advances a pointer around the candidates instead of repeatedly moving queue entries.

<iframe data-paging="second-chance" src="/visualizations/paging/second-chance" title="Interactive Second Chance page replacement walkthrough" width="100%" height="850" loading="lazy"></iframe>


### Least Recently Used (LRU)

Rather than recording arrival order or a single reference bit, the order of accesses is recorded, creating **Least Recently Used**. The page whose most recent access lies furthest in the past becomes the *victim*. This reinforces a practical expectation of program behavior fundamentally, rather than a guarantee about the next request innately.

Because this approach relies on **temporal locality**, recently accessed memory is often accessed again soon, letting LRU update its bookkeeping on *every access, including hits*.

<iframe data-paging="lru" src="/visualizations/paging/lru" title="Interactive LRU page replacement walkthrough" width="100%" height="850" loading="lazy"></iframe>

## Conclusion

Here is a diagram that sums this all up (GPT-generated diagram, sourced from what I drew on paper, sorry, again):

![Neon CPU Page Fault Flowchart](/articles/virtual-memory-and-paging/Neon%20CPU%20Page%20Fault%20Flowchart.png)

## References

### Course Materials

The following resources are from **ITSC-3146: Intro Operating Systems & Networking, UNC Charlotte General Curriculum**. The worked examples and animations in this article draw on these materials and my annotated slideshow.

- *Memory Management — Part 4.* Lecture slides and accompanying transcription.
- *Memory Management — Part 5a.* Lecture slides and accompanying transcription.
- *Memory Management — Part 5b.*
- *ITSC-3146 Module 8-1 — Memory Management.* Supplemental slides.
- *Memory Management — Part 6.* Lecture slides and accompanying transcription.
- *Memory Management — Part 7.* Lecture slides and accompanying transcription.
- *Virtual-Memory.pdf.* Supplemental slide deck supplied with Module 8-2.

### Further Reading

- Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*, [Chapter 13: The Abstraction—Address Spaces](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf). Background on a process’s view of memory and the goals of virtualization.
- Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*, [Chapter 18: Paging—Introduction](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf). Pages, frames, page tables, and address translation.
- Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*, [Chapter 22: Beyond Physical Memory—Policies](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf). FIFO, LRU, reference bits, Clock, and replacement-policy comparisons.
- John T. Bell. [Operating Systems: Virtual Memory](https://www.cs.uic.edu/~jbell/CourseNotes/OperatingSystems/9_VirtualMemory.html). University of Illinois Chicago course notes, based on *Operating System Concepts*, Ninth Edition, by Abraham Silberschatz, Greg Gagne, and Peter Baer Galvin. Demand paging, fault handling, and replacement diagrams.
